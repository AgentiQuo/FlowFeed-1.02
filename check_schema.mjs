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
  const [columns] = await connection.execute('DESCRIBE brandCredentials');
  console.log('brandCredentials columns:');
  columns.forEach(col => {
    console.log(`  - ${col.Field}: ${col.Type}`);
  });
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
