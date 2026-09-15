import pg from "pg";

async function initDb() {
  console.log("Connecting as postgres user...");
  const pool = new pg.Pool({
    connectionString: "postgresql://postgres:theovine@localhost:5432/postgres",
  });

  try {
    const roleCheck = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = 'theovine'");
    if (roleCheck.rows.length === 0) {
      await pool.query("CREATE ROLE theovine WITH LOGIN PASSWORD 'theovine' SUPERUSER CREATEDB");
      console.log("✅ Created role 'theovine' with password 'theovine'");
    } else {
      await pool.query("ALTER ROLE theovine WITH PASSWORD 'theovine' SUPERUSER CREATEDB");
      console.log("✅ Updated role 'theovine' password and privileges");
    }

    const dbCheck = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'cfjersey'");
    if (dbCheck.rows.length === 0) {
      await pool.query("CREATE DATABASE cfjersey OWNER theovine");
      console.log("✅ Created database 'cfjersey' owned by 'theovine'");
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
