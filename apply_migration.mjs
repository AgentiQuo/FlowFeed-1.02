import mysql from "mysql2/promise";

async function applyMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "social_poster",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("Applying migration...");
    
    try {
      await connection.execute(`ALTER TABLE \`drafts\` ADD \`feedback\` text`);
      console.log("✓ Added feedback column");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("✓ feedback column already exists");
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(`ALTER TABLE \`drafts\` ADD \`tone\` varchar(50) DEFAULT 'professional'`);
      console.log("✓ Added tone column");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("✓ tone column already exists");
      } else {
        throw err;
      }
    }

    console.log("Migration complete!");
  } finally {
    await connection.end();
  }
}

applyMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
