import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";
import { ENV } from "../_core/env";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

// -------------------------------------------------------------
// Connection
// -------------------------------------------------------------

/** How long to serve the CSV fallback before trying the database again. */
const OFFLINE_RETRY_MS = 5 * 60 * 1000;
const CONNECTION_ERROR_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "CONNECT_TIMEOUT"]);

let _db: Database | null = null;
let _offlineSince = 0;

export function markDbOffline(error?: unknown) {
  _offlineSince = Date.now();
  const reason = error instanceof Error ? error.message : String(error ?? "Offline");
  console.warn("[Database] Database unreachable. Serving from the CSV dataset:", reason);
}

/** Logs a failed query and pauses further attempts when the database itself is down. */
export function reportQueryFailure(scope: string, error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code && CONNECTION_ERROR_CODES.has(code)) {
    markDbOffline(error);
    return;
  }
  console.warn(`[Database] ${scope} failed:`, error);
}

export async function getDb(): Promise<Database | null> {
  if (_offlineSince) {
    if (Date.now() - _offlineSince < OFFLINE_RETRY_MS) return null;
    _offlineSince = 0;
  }
  if (_db) return _db;

  // Port 6543 is Supabase's transaction pooler; this app connects through the
  // session pooler on 5432.
  const connectionString = ENV.databaseUrl.replace(":6543", ":5432");
  if (!connectionString) return null;

  try {
    const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
    const client = postgres(connectionString, {
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: isRemote ? 5 : 20,
      idle_timeout: 30,
      connect_timeout: 3,
      prepare: false,
    });
    _db = drizzle(client, { schema });
  } catch (error) {
    markDbOffline(error);
    _db = null;
  }
  return _db;
}

/**
 * Returns the database only after a round trip succeeds. `getDb` connects
 * lazily, so it returns a client even when the server is unreachable; flows
 * that must not half-complete (like sign-in) check with this first.
 */
export async function getReachableDb(): Promise<Database | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.execute(sql`select 1`);
    return db;
  } catch (error) {
    reportQueryFailure("Connectivity check", error);
    return null;
  }
}
