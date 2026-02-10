// Quick database fix script
// Run with: node fix-database.js

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function fixDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check current users
    const users = await db.user.findMany();
    console.log(`Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log('No users found. This confirms the migration wiped the data.');
      console.log('Please log in to your app and visit /fix-user to recreate your account.');
    } else {
      console.log('Users found:');
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - Credits: ${user.credits}, Tier: ${user.tier}`);
      });
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixDatabase();