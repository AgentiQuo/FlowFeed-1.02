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
  // Find Modern Villas brand
  const [brands] = await connection.execute('SELECT id, name FROM brands WHERE name LIKE "%Modern%"');
  console.log('Brands:', brands);
  
  if (brands.length > 0) {
    const brandId = brands[0].id;
    
    // Get Facebook credentials
    const [creds] = await connection.execute(
      'SELECT platform, credentialsEncrypted FROM brandCredentials WHERE brandId = ? AND platform = ?',
      [brandId, 'facebook']
    );
    
    console.log('\nFacebook credentials stored:');
    if (creds.length > 0) {
      console.log('Platform:', creds[0].platform);
      console.log('Encrypted creds length:', creds[0].credentialsEncrypted?.length || 0);
      console.log('Raw encrypted:', creds[0].credentialsEncrypted?.substring(0, 50) + '...');
    } else {
      console.log('No Facebook credentials found');
    }
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
