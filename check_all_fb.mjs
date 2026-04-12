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
    'SELECT platform, accountId, accountName, credentials FROM brandCredentials WHERE platform = ?',
    ['facebook']
  );
  
  console.log(`Found ${creds.length} Facebook credential entries:`);
  creds.forEach((c, i) => {
    console.log(`\n[${i+1}] Account Name: ${c.accountName}`);
    console.log(`    Account ID: ${c.accountId}`);
    console.log(`    Credentials (first 80 chars): ${c.credentials?.substring(0, 80) || 'empty'}`);
  });
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
