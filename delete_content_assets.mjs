import mysql from 'mysql2/promise';

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
  const [result] = await connection.execute('DELETE FROM contentAssets');
  console.log(`✅ Deleted ${result.affectedRows} image assets`);
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
