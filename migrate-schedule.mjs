import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  // Parse DATABASE_URL
  const dbUrl = new URL(process.env.DATABASE_URL);
  const connection = await createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || '3306'),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'drizzle/0005_violet_lucky_pierre.sql'), 'utf8');
    await connection.query(sql);
    console.log('✓ Migration applied successfully');
    
    // Insert default schedules
    const defaults = [
      { id: '1', platform: 'instagram', minHours: 2, maxHours: 3 },
      { id: '2', platform: 'x', minHours: 1, maxHours: 2 },
      { id: '3', platform: 'facebook', minHours: 4, maxHours: 6 },
      { id: '4', platform: 'linkedin', minHours: 3, maxHours: 5 },
    ];
    
    for (const schedule of defaults) {
      await connection.query(
        'INSERT IGNORE INTO postingSchedules (id, platform, minHoursBetweenPosts, maxHoursBetweenPosts, isActive) VALUES (?, ?, ?, ?, true)',
        [schedule.id, schedule.platform, schedule.minHours, schedule.maxHours]
      );
    }
    console.log('✓ Default schedules inserted');
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
