import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || "postgresql://localhost:5432/cfjersey";
const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || "";

async function main() {
  console.log("=== STARTING SUPABASE FAST BATCH MIGRATION ===");
  
  const supaPool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 10
  });

  const localPool = new Pool({
    connectionString: LOCAL_DB_URL,
    ssl: false
  });

  try {
    console.log("Connecting to Supabase...");
    await supaPool.query("SELECT 1");
    console.log("Connected to Supabase successfully!");

    // 1. Create Enums
    console.log("Creating enums...");
    await supaPool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE order_request_status AS ENUM ('new', 'contacted', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE reminder_delivery_status AS ENUM ('claimed', 'delivered');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Tables
    console.log("Ensuring all tables & indexes on Supabase...");
    await supaPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        open_id VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        phone VARCHAR(64),
        password_hash TEXT,
        login_method VARCHAR(64),
        role user_role NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_signed_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        email VARCHAR(320),
        accepts_email_marketing VARCHAR(16),
        default_address_company TEXT,
        default_address_address1 TEXT,
        default_address_address2 TEXT,
        default_address_city TEXT,
        default_address_province_code VARCHAR(64),
        default_address_country_code VARCHAR(64),
        default_address_zip VARCHAR(64),
        default_address_phone VARCHAR(64),
        phone VARCHAR(64),
        accepts_sms_marketing VARCHAR(16),
        total_spent NUMERIC(12, 2) DEFAULT '0.00',
        total_orders INTEGER DEFAULT 0,
        note TEXT,
        tax_exempt VARCHAR(16),
        tags TEXT,
        accepts_whatsapp_marketing VARCHAR(16),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        handle VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        body_html TEXT,
        vendor VARCHAR(255),
        product_category TEXT,
        type VARCHAR(255),
        tags TEXT,
        published VARCHAR(32),
        status VARCHAR(64),
        option1_name VARCHAR(128),
        option2_name VARCHAR(128),
        option3_name VARCHAR(128),
        seo_title TEXT,
        seo_description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_handle VARCHAR(255) NOT NULL REFERENCES products(handle) ON DELETE CASCADE,
        sku VARCHAR(128),
        option1_value TEXT,
        option2_value TEXT,
        option3_value TEXT,
        price NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
        compare_at_price NUMERIC(12, 2),
        grams NUMERIC(10, 2) DEFAULT '0.00',
        inventory_qty INTEGER DEFAULT 0,
        inventory_policy VARCHAR(64),
        fulfillment_service VARCHAR(64),
        inventory_tracker VARCHAR(64),
        requires_shipping BOOLEAN DEFAULT true,
        taxable BOOLEAN DEFAULT true,
        barcode VARCHAR(128),
        image_src TEXT,
        position INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS product_variants_handle_idx ON product_variants(product_handle);
      CREATE INDEX IF NOT EXISTS product_variants_sku_idx ON product_variants(sku);

      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_handle VARCHAR(255) NOT NULL REFERENCES products(handle) ON DELETE CASCADE,
        src TEXT NOT NULL,
        position INTEGER DEFAULT 1,
        alt_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS product_images_handle_idx ON product_images(product_handle);

      CREATE TABLE IF NOT EXISTS orders (
        name VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64),
        email VARCHAR(320),
        financial_status VARCHAR(64),
        paid_at TIMESTAMP WITH TIME ZONE,
        fulfillment_status VARCHAR(64),
        fulfilled_at TIMESTAMP WITH TIME ZONE,
        accepts_marketing VARCHAR(16),
        currency VARCHAR(10) DEFAULT 'USD',
        subtotal NUMERIC(12, 2) DEFAULT '0.00',
        shipping NUMERIC(12, 2) DEFAULT '0.00',
        taxes NUMERIC(12, 2) DEFAULT '0.00',
        total NUMERIC(12, 2) DEFAULT '0.00',
        discount_code TEXT,
        discount_amount NUMERIC(12, 2) DEFAULT '0.00',
        shipping_method TEXT,
        billing_name TEXT,
        billing_street TEXT,
        billing_address1 TEXT,
        billing_address2 TEXT,
        billing_company TEXT,
        billing_city TEXT,
        billing_zip TEXT,
        billing_province TEXT,
        billing_country TEXT,
        billing_phone VARCHAR(64),
        shipping_name TEXT,
        shipping_street TEXT,
        shipping_address1 TEXT,
        shipping_address2 TEXT,
        shipping_company TEXT,
        shipping_city TEXT,
        shipping_zip TEXT,
        shipping_province TEXT,
        shipping_country TEXT,
        shipping_phone VARCHAR(64),
        notes TEXT,
        note_attributes TEXT,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        payment_method TEXT,
        payment_reference TEXT,
        refunded_amount NUMERIC(12, 2) DEFAULT '0.00',
        vendor TEXT,
        outstanding_balance NUMERIC(12, 2) DEFAULT '0.00',
        tags TEXT,
        risk_level VARCHAR(64),
        source VARCHAR(64),
        phone VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(email);
      CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

      CREATE TABLE IF NOT EXISTS order_line_items (
        id SERIAL PRIMARY KEY,
        order_name VARCHAR(64) NOT NULL REFERENCES orders(name) ON DELETE CASCADE,
        lineitem_quantity INTEGER DEFAULT 1,
        lineitem_name TEXT NOT NULL,
        lineitem_price NUMERIC(12, 2) DEFAULT '0.00',
        lineitem_compare_at_price NUMERIC(12, 2),
        lineitem_sku VARCHAR(128),
        lineitem_requires_shipping BOOLEAN DEFAULT true,
        lineitem_taxable BOOLEAN DEFAULT true,
        lineitem_fulfillment_status VARCHAR(64),
        lineitem_discount NUMERIC(12, 2) DEFAULT '0.00',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS order_line_items_order_name_idx ON order_line_items(order_name);

      CREATE TABLE IF NOT EXISTS order_requests (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(32) NOT NULL UNIQUE,
        customer_name VARCHAR(120) NOT NULL,
        email VARCHAR(320) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        notes TEXT,
        items TEXT NOT NULL,
        subtotal INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
        status order_request_status NOT NULL DEFAULT 'new',
        fulfillment_stage VARCHAR(32) DEFAULT 'placed',
        courier_name VARCHAR(120),
        tracking_number VARCHAR(120),
        tracking_url TEXT,
        contacted_at TIMESTAMP WITH TIME ZONE,
        last_follow_up_reminder_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS order_requests_status_idx ON order_requests(status);
      CREATE INDEX IF NOT EXISTS order_requests_created_at_idx ON order_requests(created_at);

      CREATE TABLE IF NOT EXISTS follow_up_reminder_settings (
        id SERIAL PRIMARY KEY,
        schedule_cron_task_uid VARCHAR(65) UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_run_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS follow_up_reminder_deliveries (
        id SERIAL PRIMARY KEY,
        order_request_id INTEGER NOT NULL,
        reminder_date VARCHAR(10) NOT NULL,
        claim_token VARCHAR(64) NOT NULL,
        status reminder_delivery_status NOT NULL DEFAULT 'claimed',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        delivered_at TIMESTAMP WITH TIME ZONE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS follow_up_reminder_deliveries_order_day_unique ON follow_up_reminder_deliveries(order_request_id, reminder_date);

      CREATE TABLE IF NOT EXISTS product_analytics_events (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(128) NOT NULL,
        product_name TEXT NOT NULL,
        event_type VARCHAR(64) NOT NULL DEFAULT 'add_to_bag',
        color VARCHAR(64),
        size VARCHAR(32),
        price NUMERIC(12, 2) DEFAULT '0.00',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS product_analytics_events_product_idx ON product_analytics_events(product_id);
      CREATE INDEX IF NOT EXISTS product_analytics_events_type_idx ON product_analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS product_analytics_events_created_at_idx ON product_analytics_events(created_at);
    `);

    console.log("✓ Schema & tables verified on Supabase.");

    // 3. Batch migrate from local DB
    try {
      await localPool.query("SELECT 1");
      const tables = ["users", "customers", "products", "product_variants", "product_images", "orders", "order_line_items", "order_requests", "product_analytics_events"];
      
      for (const t of tables) {
        const { rows } = await localPool.query(`SELECT * FROM ${t}`);
        if (rows.length === 0) continue;

        console.log(`Migrating ${rows.length} rows from '${t}'...`);
        const BATCH_SIZE = 100;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const chunk = rows.slice(i, i + BATCH_SIZE);
          const keys = Object.keys(chunk[0]);
          const cols = keys.map(k => `"${k}"`).join(", ");
          
          const values: any[] = [];
          const rowPlaceholders: string[] = [];
          
          chunk.forEach((row, rowIdx) => {
            const p: string[] = [];
            keys.forEach(k => {
              values.push(row[k]);
              p.push(`$${values.length}`);
            });
            rowPlaceholders.push(`(${p.join(", ")})`);
          });

          const sql = `INSERT INTO ${t} (${cols}) VALUES ${rowPlaceholders.join(", ")} ON CONFLICT DO NOTHING;`;
          await supaPool.query(sql, values);
        }
        console.log(`✓ '${t}' completed (${rows.length} rows).`);
      }
    } catch (e: any) {
      console.log("Local DB check notice:", e.message);
    }

    console.log("=== SUPABASE MIGRATION SUCCESSFULLY FINISHED! ===");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await supaPool.end();
    await localPool.end();
  }
}

main();
