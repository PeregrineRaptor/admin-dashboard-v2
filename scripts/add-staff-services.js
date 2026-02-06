import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../src/lib/db/schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('Adding staff members and updating services...\n');
  
  const hashedPassword = await bcrypt.hash('staff123', 10);
  
  const staffMembers = [
    { firstName: 'Rhys', lastName: 'Fraser', email: 'rhys@raptorclean.com', role: 'service_provider' },
    { firstName: 'Renata', lastName: 'Kotlarova', email: 'renata@raptorclean.com', role: 'service_provider' },
  ];
  
  console.log('--- Adding Staff Members ---');
  for (const staff of staffMembers) {
    try {
      const existing = await db.select().from(schema.users).where(eq(schema.users.email, staff.email)).limit(1);
      if (existing.length === 0) {
        const [user] = await db.insert(schema.users).values({
          email: staff.email,
          passwordHash: hashedPassword,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          isActive: true,
        }).returning();
        console.log(`  Created: ${staff.firstName} ${staff.lastName} (${staff.email})`);
        
        await db.insert(schema.staffStats).values({
          userId: user.id,
          totalXP: Math.floor(Math.random() * 5000),
          totalEarnings: (Math.random() * 10000).toFixed(2),
          totalJobsCompleted: Math.floor(Math.random() * 100) + 50,
          averageRating: (4.5 + Math.random() * 0.5).toFixed(2),
        }).onConflictDoNothing();
      } else {
        console.log(`  Exists: ${staff.firstName} ${staff.lastName}`);
      }
    } catch (error) {
      console.error(`  Error: ${staff.email}`, error.message);
    }
  }
  
  const servicesFromAppointments = [
    { name: 'Exterior Window Cleaning', basePrice: '150.00', durationMinutes: 45, sortOrder: 1 },
    { name: 'Interior Window Cleaning', basePrice: '150.00', durationMinutes: 45, sortOrder: 2 },
    { name: 'Eaves Cleaning', basePrice: '150.00', durationMinutes: 45, sortOrder: 3 },
    { name: 'Eaves Repair', basePrice: '100.00', durationMinutes: 60, sortOrder: 4 },
    { name: 'Housekeeping', basePrice: '200.00', durationMinutes: 120, sortOrder: 5 },
    { name: 'Frames Deep Cleaning', basePrice: '100.00', durationMinutes: 30, sortOrder: 6 },
    { name: 'Downspout Repair', basePrice: '75.00', durationMinutes: 30, sortOrder: 7 },
    { name: 'Redo Eaves', basePrice: '50.00', durationMinutes: 30, sortOrder: 8 },
    { name: 'Service Call', basePrice: '50.00', durationMinutes: 30, isPublic: false, sortOrder: 9 },
  ];
  
  console.log('\n--- Updating Services ---');
  for (const service of servicesFromAppointments) {
    try {
      const existing = await db.select().from(schema.services).where(eq(schema.services.name, service.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(schema.services).values({
          name: service.name,
          basePrice: service.basePrice,
          durationMinutes: service.durationMinutes,
          isActive: true,
          isPublic: service.isPublic !== false,
          sortOrder: service.sortOrder,
        });
        console.log(`  Created: ${service.name} - $${service.basePrice}`);
      } else {
        console.log(`  Exists: ${service.name}`);
      }
    } catch (error) {
      console.error(`  Error: ${service.name}`, error.message);
    }
  }
  
  const [staffCount] = await db.select({ count: sql`count(*)` }).from(schema.users).where(eq(schema.users.role, 'service_provider'));
  const [serviceCount] = await db.select({ count: sql`count(*)` }).from(schema.services);
  
  console.log('\n--- Summary ---');
  console.log(`Total service providers: ${staffCount.count}`);
  console.log(`Total services: ${serviceCount.count}`);
  
  console.log('\nDone!');
  await pool.end();
}

main().catch(console.error);
