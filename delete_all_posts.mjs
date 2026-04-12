import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  // Delete all drafts
  const [draftResult] = await connection.execute('DELETE FROM drafts');
  console.log(`Deleted ${draftResult.affectedRows} drafts`);

  // Delete all posts
  const [postResult] = await connection.execute('DELETE FROM posts');
  console.log(`Deleted ${postResult.affectedRows} posts`);

  console.log('✅ All drafts and posts deleted successfully');
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
