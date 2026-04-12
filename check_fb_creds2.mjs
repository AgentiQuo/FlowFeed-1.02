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
  const [creds] = await connection.execute(
    'SELECT platform, accountId, credentials FROM brandCredentials WHERE platform = ? AND accountName LIKE "%Modern%"',
    ['facebook']
  );
  
  console.log('Facebook credentials:');
  if (creds.length > 0) {
    creds.forEach(c => {
      console.log(`\nPlatform: ${c.platform}`);
      console.log(`Account ID: ${c.accountId}`);
      console.log(`Credentials (first 100 chars): ${c.credentials?.substring(0, 100) || 'empty'}`);
    });
  } else {
    console.log('No Facebook credentials found');
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
