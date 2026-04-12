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
  const [tables] = await connection.execute('SHOW TABLES');
  console.log('Tables in database:');
  tables.forEach(row => {
    const tableName = Object.values(row)[0];
    console.log(`  - ${tableName}`);
  });
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
