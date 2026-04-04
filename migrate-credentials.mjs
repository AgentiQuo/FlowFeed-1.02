import mysql from 'mysql2/promise.js';

async function migrate() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Creating brandCredentials table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS \`brandCredentials\` (
        \`id\` varchar(36) NOT NULL,
        \`brandId\` varchar(36) NOT NULL,
        \`platform\` enum('instagram','linkedin','facebook','x','website') NOT NULL,
        \`accountId\` varchar(255),
        \`accountName\` varchar(255),
        \`accountEmail\` varchar(320),
        \`credentials\` longtext NOT NULL,
        \`isActive\` boolean NOT NULL DEFAULT true,
        \`lastVerified\` timestamp,
        \`verificationStatus\` enum('pending','verified','failed') DEFAULT 'pending',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`brandCredentials_id\` PRIMARY KEY(\`id\`)
      );
    `;

    await connection.execute(sql);
    console.log('✓ brandCredentials table created successfully');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
