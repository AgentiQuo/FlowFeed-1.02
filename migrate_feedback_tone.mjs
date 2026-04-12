import mysql from "mysql2/promise";

const pool = mysql.createPool({
  connectionLimit: 1,
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "social_poster",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log("Applying migration...");
    await connection.query(
      `ALTER TABLE \`drafts\` ADD \`feedback\` text`
    );
    console.log("✓ Added feedback column");
    
    await connection.query(
      `ALTER TABLE \`drafts\` ADD \`tone\` varchar(50) DEFAULT 'professional'`
    );
    console.log("✓ Added tone column");
    
    console.log("Migration complete!");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Columns already exist, skipping...");
    } else {
      console.error("Migration failed:", err.message);
      throw err;
    }
  } finally {
    await connection.release();
    await pool.end();
  }
}

migrate();
