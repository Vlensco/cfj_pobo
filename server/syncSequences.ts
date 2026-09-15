import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const tables = [
  "users",
  "product_variants",
  "product_images",
  "order_line_items",
  "order_requests",
  "follow_up_reminder_settings",
  "follow_up_reminder_deliveries",
  "product_analytics_events",
];

async function syncSequences(url: string, name: string, isRemote: boolean) {
  console.log(`Syncing sequences for ${name}...`);
  const pool = new Pool({
    connectionString: url,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  try {
    for (const t of tables) {
      try {
        const res = await pool.query(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'), coalesce(max(id), 0) + 1, false) FROM ${t};`
        );
        console.log(`  ✓ Synced ${t} -> next id:`, res.rows[0]?.setval);
      } catch (err: any) {
        console.log(`  Notice on ${t}:`, err.message);
      }
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || "postgresql://theovine:theovine@localhost:5432/cfjersey";
  const supaUrl = process.env.SUPABASE_DATABASE_URL || "postgresql://postgres.ykwahzzufhejebscjjvv:cfjpobobatam@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

  try {
    await syncSequences(localUrl, "Local DB", false);
  } catch (e: any) {
    console.log("Local DB skip:", e.message);
  }

  try {
    await syncSequences(supaUrl, "Supabase DB", true);
  } catch (e: any) {
    console.log("Supabase DB error:", e.message);
  }
  console.log("Sequence sync complete!");
}

main();
