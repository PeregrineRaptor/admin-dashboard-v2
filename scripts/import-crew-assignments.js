import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { db } from '../src/lib/db/index.js';
import { bookings, users, crewMembers, crews } from '../src/lib/db/schema.js';
import { eq, ilike, sql } from 'drizzle-orm';

async function importCrewAssignments() {
  console.log('Reading appointments CSV...');
  const csvContent = fs.readFileSync('attached_assets/appointments-20260202T2331_1770084852763.csv', 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  
  console.log(`Found ${records.length} appointments in CSV`);
  
  const allUsers = await db.select({
    user: users,
    crewMember: crewMembers,
    crew: crews,
  })
  .from(users)
  .leftJoin(crewMembers, eq(users.id, crewMembers.userId))
  .leftJoin(crews, eq(crewMembers.crewId, crews.id));
  
  const staffToCrewMap = {};
  for (const u of allUsers) {
    const fullName = `${u.user.firstName} ${u.user.lastName}`.toLowerCase().trim();
    if (u.crew?.id) {
      staffToCrewMap[fullName] = u.crew.id;
    }
  }
  
  console.log('Staff to Crew mapping:', staffToCrewMap);
  
  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const record of records) {
    const appointmentId = record.appointment_id;
    const staffName = record.staff?.toLowerCase().trim();
    
    if (!appointmentId || !staffName) {
      skipped++;
      continue;
    }
    
    const crewId = staffToCrewMap[staffName];
    if (!crewId) {
      skipped++;
      continue;
    }
    
    const [existing] = await db.select()
      .from(bookings)
      .where(eq(bookings.squareAppointmentId, appointmentId))
      .limit(1);
    
    if (!existing) {
      notFound++;
      continue;
    }
    
    if (existing.crewId !== crewId) {
      await db.update(bookings)
        .set({ crewId, updatedAt: new Date() })
        .where(eq(bookings.squareAppointmentId, appointmentId));
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Not found in DB: ${notFound}`);
}

importCrewAssignments()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
