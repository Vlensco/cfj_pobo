import "dotenv/config";
import pg from "pg";

/**
 * Creates the local development role and database described by
 * LOCAL_DATABASE_URL (or DATABASE_URL), connecting as a Postgres superuser
 * through POSTGRES_ADMIN_URL. Local development only.
 */
async function initDb() {
  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  const targetUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
  if (!adminUrl || !targetUrl) {
    throw new Error("Set POSTGRES_ADMIN_URL and LOCAL_DATABASE_URL (or DATABASE_URL) in .env first.");
  }

  const target = new URL(targetUrl);
  const role = decodeURIComponent(target.username);
  const password = decodeURIComponent(target.password);
  const database = target.pathname.replace(/^\//, "");
  if (!role || !password || !database) {
    throw new Error("The target database URL must include a user, a password, and a database name.");
  }
  if (!["localhost", "127.0.0.1"].includes(target.hostname)) {
    throw new Error("init-db only provisions a local database.");
  }

  const roleName = pg.escapeIdentifier(role);
  const rolePassword = pg.escapeLiteral(password);
  const pool = new pg.Pool({ connectionString: adminUrl });

  try {
    const existingRole = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    const verb = existingRole.rows.length === 0 ? "CREATE" : "ALTER";
    await pool.query(`${verb} ROLE ${roleName} WITH LOGIN PASSWORD ${rolePassword} SUPERUSER CREATEDB`);
    console.log(`✅ Role '${role}' is ready`);

    const existingDb = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (existingDb.rows.length === 0) {
      await pool.query(`CREATE DATABASE ${pg.escapeIdentifier(database)} OWNER ${roleName}`);
      console.log(`✅ Created database '${database}' owned by '${role}'`);
    } else {
      console.log(`✅ Database '${database}' already exists`);
    }
  } finally {
    await pool.end();
  }
}

initDb().catch(error => {
  console.error("❌ Init DB error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
