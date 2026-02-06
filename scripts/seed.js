import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/lib/db/schema.js';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num.toFixed(2);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return null;
}

function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  try {
    const [datePart, timePart, ampm] = dateTimeStr.split(' ');
    const [month, day, year] = datePart.split('-');
    let [hours, minutes, seconds] = timePart.split(':');
    hours = parseInt(hours);
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return {
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      time: `${hours.toString().padStart(2, '0')}:${minutes}:${seconds || '00'}`,
    };
  } catch (e) {
    return null;
  }
}

async function seed() {
  console.log('Starting database seed...');
  
  const customersPath = path.join(process.cwd(), 'attached_assets/export-20260202-233103_1770075163241.csv');
  const appointmentsPath = path.join(process.cwd(), 'attached_assets/appointments-20260202T2331_1770075163234.csv');
  
  const customersCSV = fs.readFileSync(customersPath, 'utf-8');
  const appointmentsCSV = fs.readFileSync(appointmentsPath, 'utf-8');
  
  const customerRows = parseCSV(customersCSV);
  const appointmentRows = parseCSV(appointmentsCSV);
  
  console.log(`Found ${customerRows.length} customers and ${appointmentRows.length} appointments`);
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  console.log('Creating admin user...');
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
  
  const citiesSet = new Set();
  customerRows.forEach(row => {
    if (row['City']) {
      citiesSet.add(row['City'].trim());
    }
  });
  
  console.log(`Creating ${citiesSet.size} cities...`);
  for (const cityName of citiesSet) {
    if (cityName) {
      await db.insert(schema.cities).values({
        name: cityName,
        province: 'Ontario',
        isActive: true,
      }).onConflictDoNothing();
    }
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
  
  console.log('Importing customers...');
  let customerCount = 0;
  const customerIdMap = new Map();
  
  for (const row of customerRows) {
    const hasSeasonPass = row['2026 Season Pass']?.toLowerCase() === 'yes';
    const isBlocked = row['Blocked from online booking']?.toLowerCase() === 'yes';
    
    try {
      const result = await db.insert(schema.customers).values({
        squareCustomerId: row['Square Customer ID'] || null,
        referenceId: row['Reference ID'] || null,
        firstName: row['First Name'] || null,
        lastName: row['Surname'] || null,
        companyName: row['Company Name'] || null,
        email: row['Email Address'] || null,
        phone: row['Phone Number']?.replace(/'/g, '') || null,
        nickname: row['Nickname'] || null,
        streetAddress1: row['Street Address 1'] || null,
        streetAddress2: row['Street Address 2'] || null,
        city: row['City'] || null,
        state: row['State'] || 'Ontario',
        postalCode: row['Postal Code'] || null,
        birthday: null,
        memo: row['Memo'] || null,
        windowsPrice: parsePrice(row['Windows Cleaning Price']),
        eavesPrice: parsePrice(row['Eaves Cleaning Price']),
        hasSeasonPass: hasSeasonPass,
        seasonPassYear: hasSeasonPass ? 2026 : null,
        isBlockedFromOnlineBooking: isBlocked,
        emailSubscriptionStatus: row['Email Subscription Status'] || null,
        firstVisit: parseDate(row['First Visit']),
        lastVisit: parseDate(row['Last Visit']),
        transactionCount: parseInt(row['Transaction Count']) || 0,
        lifetimeSpend: parsePrice(row['Lifetime Spend']) || '0',
      }).returning({ id: schema.customers.id });
      
      if (row['Square Customer ID']) {
        customerIdMap.set(row['Square Customer ID'], result[0]?.id);
      }
      if (row['Email Address']) {
        customerIdMap.set(row['Email Address'].toLowerCase(), result[0]?.id);
      }
      
      customerCount++;
      if (customerCount % 100 === 0) {
        console.log(`  Imported ${customerCount} customers...`);
      }
    } catch (error) {
      console.error(`Error importing customer: ${row['First Name']} ${row['Surname']}`, error.message);
    }
  }
  
  console.log(`Imported ${customerCount} customers total`);
  
  console.log('Importing appointments...');
  let appointmentCount = 0;
  
  for (const row of appointmentRows) {
    try {
      const startParsed = parseDateTime(row['start']);
      const endParsed = parseDateTime(row['end']);
      
      if (!startParsed) continue;
      
      let customerId = null;
      if (row['client_email']) {
        customerId = customerIdMap.get(row['client_email'].toLowerCase());
      }
      
      const statusMap = {
        'accepted': 'completed',
        'cancelled_by_seller': 'cancelled',
        'cancelled_by_buyer': 'cancelled',
        'pending': 'pending',
      };
      
      await db.insert(schema.bookings).values({
        squareAppointmentId: row['appointment_id'] || null,
        customerId: customerId,
        status: statusMap[row['status']] || 'pending',
        scheduledDate: startParsed.date,
        startTime: startParsed.time,
        endTime: endParsed?.time || null,
        address: row['address'] || null,
        noteFromClient: row['note_from_client'] || null,
        noteFromBusiness: row['note_from_business'] || null,
      });
      
      appointmentCount++;
      if (appointmentCount % 500 === 0) {
        console.log(`  Imported ${appointmentCount} appointments...`);
      }
    } catch (error) {
      if (!error.message.includes('duplicate')) {
        console.error(`Error importing appointment: ${row['appointment_id']}`, error.message);
      }
    }
  }
  
  console.log(`Imported ${appointmentCount} appointments total`);
  
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
  await pool.end();
}

seed().catch(console.error);
