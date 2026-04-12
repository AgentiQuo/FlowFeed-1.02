import mysql from 'mysql2/promise';

// Parse DATABASE_URL to get connection details
const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: url.hostname.includes('tidb') ? { rejectUnauthorized: false } : undefined,
});

try {
  const [result] = await connection.execute('DELETE FROM assets');
  console.log(`✅ Deleted ${result.affectedRows} assets`);
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
