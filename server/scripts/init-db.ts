import pg from "pg";

async function initDb() {
  console.log("Connecting as postgres user...");
  const pool = new pg.Pool({
    connectionString: "postgresql://postgres:REMOVED_SECRET@localhost:5432/postgres",
  });

  try {
    const roleCheck = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = 'REMOVED_SECRET'");
    if (roleCheck.rows.length === 0) {
      await pool.query("CREATE ROLE REMOVED_SECRET WITH LOGIN PASSWORD 'REMOVED_SECRET' SUPERUSER CREATEDB");
      console.log("✅ Created role 'REMOVED_SECRET' with password 'REMOVED_SECRET'");
    } else {
      await pool.query("ALTER ROLE REMOVED_SECRET WITH PASSWORD 'REMOVED_SECRET' SUPERUSER CREATEDB");
      console.log("✅ Updated role 'REMOVED_SECRET' password and privileges");
    }

    const dbCheck = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'cfjersey'");
    if (dbCheck.rows.length === 0) {
      await pool.query("CREATE DATABASE cfjersey OWNER REMOVED_SECRET");
      console.log("✅ Created database 'cfjersey' owned by 'REMOVED_SECRET'");
    } else {
      console.log("✅ Database 'cfjersey' already exists");
    }
  } catch (error) {
    console.error("❌ Init DB error:", error);
  } finally {
    await pool.end();
  }
}

initDb();
