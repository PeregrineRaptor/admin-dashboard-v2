import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/lib/db/schema.js';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('Starting database seed...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  console.log('Creating admin users...');
  await db.insert(schema.users).values({
    email: 'admin@raptor.com',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  }).onConflictDoNothing();

  await db.insert(schema.users).values({
    email: 'rhys@raptorwindowcleaning.com',
    passwordHash: hashedPassword,
    firstName: 'Rhys',
    lastName: 'Fraser',
    role: 'admin',
    isActive: true,
  }).onConflictDoNothing();

  console.log('Creating services...');
  const servicesData = [
    { name: 'Exterior Window Cleaning', basePrice: '150.00', durationMinutes: 45, isActive: true, isPublic: true, sortOrder: 1 },
    { name: 'Interior Window Cleaning', basePrice: '150.00', durationMinutes: 45, isActive: true, isPublic: true, sortOrder: 2 },
    { name: 'Eaves Cleaning', basePrice: '150.00', durationMinutes: 45, isActive: true, isPublic: true, sortOrder: 3 },
    { name: 'Frames Deep Cleaning', basePrice: '100.00', durationMinutes: 30, isActive: true, isPublic: true, sortOrder: 4 },
    { name: 'Service Call', basePrice: '50.00', durationMinutes: 45, isActive: true, isPublic: false, sortOrder: 5 },
  ];

  for (const service of servicesData) {
    await db.insert(schema.services).values(service).onConflictDoNothing();
  }

  console.log('Creating crews...');
  const crewsData = [
    { name: 'Alpha Crew', color: '#3B82F6' },
    { name: 'Bravo Crew', color: '#10B981' },
    { name: 'Charlie Crew', color: '#F59E0B' },
  ];

  for (const crew of crewsData) {
    await db.insert(schema.crews).values(crew).onConflictDoNothing();
  }

  console.log('Creating achievements...');
  const achievementsData = [
    { name: 'First Job', description: 'Complete your first cleaning job', icon: 'star', xpReward: 50, criteria: { totalJobs: 1 } },
    { name: 'Rising Star', description: 'Complete 10 jobs', icon: 'trending_up', xpReward: 100, criteria: { totalJobs: 10 } },
    { name: 'Veteran Cleaner', description: 'Complete 50 jobs', icon: 'military_tech', xpReward: 250, criteria: { totalJobs: 50 } },
    { name: 'Century Club', description: 'Complete 100 jobs', icon: 'emoji_events', xpReward: 500, criteria: { totalJobs: 100 } },
    { name: 'Perfect 5', description: 'Get 5 perfect ratings in a row', icon: 'grade', xpReward: 200, criteria: { perfectStreak: 5 } },
    { name: 'Customer Favorite', description: 'Maintain 4.8+ average rating', icon: 'favorite', xpReward: 300, criteria: { averageRating: 4.8 } },
    { name: '$1K Earner', description: 'Earn $1,000 total', icon: 'attach_money', xpReward: 100, criteria: { totalEarnings: 1000 } },
    { name: '$5K Earner', description: 'Earn $5,000 total', icon: 'paid', xpReward: 300, criteria: { totalEarnings: 5000 } },
    { name: 'Early Bird', description: 'Complete 10 morning appointments before 9 AM', icon: 'wb_sunny', xpReward: 150, criteria: { earlyJobs: 10 } },
    { name: 'Team Player', description: 'Work with 5 different crew members', icon: 'groups', xpReward: 200, criteria: { uniqueCrewmates: 5 } },
  ];

  for (const achievement of achievementsData) {
    await db.insert(schema.achievements).values(achievement).onConflictDoNothing();
  }

  console.log('Seed completed successfully!');
  console.log('');
  console.log('Admin login credentials:');
  console.log('  Email: admin@raptor.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('You can sync your customers and bookings from Square via the Settings page.');
  await pool.end();
}

seed().catch(console.error);
