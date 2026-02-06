import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import * as schema from '../src/lib/db/schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num.toFixed(2);
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleaned = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleaned)) {
    const [month, day, year] = cleaned.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [month, day, year] = cleaned.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

function parseDateTime(dateTimeStr) {
  if (!dateTimeStr || dateTimeStr.trim() === '') return null;
  
  try {
    const parts = dateTimeStr.trim().split(' ');
    if (parts.length < 2) return null;
    
    const datePart = parts[0];
    const timePart = parts[1];
    const ampm = parts[2]?.toUpperCase();
    
    let month, day, year;
    if (datePart.includes('-')) {
      [month, day, year] = datePart.split('-');
    } else if (datePart.includes('/')) {
      [month, day, year] = datePart.split('/');
    } else {
      return null;
    }
    
    let [hours, minutes, seconds] = timePart.split(':');
    hours = parseInt(hours);
    minutes = minutes || '00';
    seconds = seconds || '00';
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    
    return { date: formattedDate, time: formattedTime };
  } catch (e) {
    return null;
  }
}

function cleanName(name) {
  if (!name) return null;
  const cleaned = name.trim();
  if (cleaned === '?' || cleaned === '-' || cleaned === '') return null;
  return cleaned;
}

function cleanPhone(phone) {
  if (!phone) return null;
  return phone.replace(/['\s]/g, '').trim() || null;
}

async function importData() {
  console.log('Starting data import...');
  
  const customersPath = path.join(process.cwd(), 'attached_assets/export-20260202-233103_1770075163241.csv');
  const appointmentsPath = path.join(process.cwd(), 'attached_assets/appointments-20260202T2331_1770075163234.csv');
  
  const customersCSV = fs.readFileSync(customersPath, 'utf-8');
  const appointmentsCSV = fs.readFileSync(appointmentsPath, 'utf-8');
  
  const customerRows = parse(customersCSV, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  
  const appointmentRows = parse(appointmentsCSV, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  
  console.log(`Found ${customerRows.length} customers and ${appointmentRows.length} appointments in CSV`);
  
  console.log('\n--- Clearing existing data ---');
  await db.execute(sql`DELETE FROM bookings`);
  await db.execute(sql`DELETE FROM customers`);
  console.log('Cleared existing customers and bookings');
  
  const citiesSet = new Set();
  customerRows.forEach(row => {
    if (row['City'] && row['City'].trim()) {
      citiesSet.add(row['City'].trim());
    }
  });
  
  console.log(`\nEnsuring ${citiesSet.size} cities exist...`);
  for (const cityName of citiesSet) {
    if (cityName) {
      await db.insert(schema.cities).values({
        name: cityName,
        province: 'Ontario',
        isActive: true,
      }).onConflictDoNothing();
    }
  }
  
  console.log('\n--- Importing customers ---');
  let customerCount = 0;
  let customerErrors = 0;
  const customerIdMap = new Map();
  
  for (const row of customerRows) {
    const hasSeasonPass = row['2026 Season Pass']?.toLowerCase() === 'yes' || 
                          row['2026 Season Pass']?.toLowerCase() === 'true';
    const isBlocked = row['Blocked from online booking']?.toLowerCase() === 'yes' ||
                      row['Blocked from online booking']?.toLowerCase() === 'true';
    
    const firstName = cleanName(row['First Name']);
    const lastName = cleanName(row['Surname']);
    const companyName = cleanName(row['Company Name']);
    
    if (!firstName && !lastName && !companyName) {
      customerErrors++;
      continue;
    }
    
    try {
      const result = await db.insert(schema.customers).values({
        squareCustomerId: row['Square Customer ID'] || null,
        referenceId: row['Reference ID'] || null,
        firstName: firstName,
        lastName: lastName,
        companyName: companyName,
        email: row['Email Address']?.trim() || null,
        phone: cleanPhone(row['Phone Number']),
        nickname: cleanName(row['Nickname']),
        streetAddress1: row['Street Address 1']?.trim() || null,
        streetAddress2: row['Street Address 2']?.trim() || null,
        city: row['City']?.trim() || null,
        state: row['State']?.trim() || 'Ontario',
        postalCode: row['Postal Code']?.trim() || null,
        birthday: null,
        memo: row['Memo']?.trim() || null,
        windowsPrice: parsePrice(row['Windows Cleaning Price']),
        eavesPrice: parsePrice(row['Eaves Cleaning Price']),
        hasSeasonPass: hasSeasonPass,
        seasonPassYear: hasSeasonPass ? 2026 : null,
        isBlockedFromOnlineBooking: isBlocked,
        emailSubscriptionStatus: row['Email Subscription Status']?.trim() || null,
        firstVisit: parseDate(row['First Visit']),
        lastVisit: parseDate(row['Last Visit']),
        transactionCount: parseInt(row['Transaction Count']) || 0,
        lifetimeSpend: parsePrice(row['Lifetime Spend']) || '0',
      }).returning({ id: schema.customers.id });
      
      const customerId = result[0]?.id;
      
      if (row['Square Customer ID']) {
        customerIdMap.set(row['Square Customer ID'], customerId);
      }
      if (row['Email Address']) {
        customerIdMap.set(row['Email Address'].toLowerCase().trim(), customerId);
      }
      const clientName = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase();
      if (clientName) {
        customerIdMap.set(clientName, customerId);
      }
      
      customerCount++;
      if (customerCount % 500 === 0) {
        console.log(`  Imported ${customerCount} customers...`);
      }
    } catch (error) {
      customerErrors++;
      if (!error.message.includes('duplicate')) {
        console.error(`Error importing customer: ${firstName} ${lastName}`, error.message);
      }
    }
  }
  
  console.log(`\nCustomers imported: ${customerCount}`);
  console.log(`Customers skipped/errors: ${customerErrors}`);
  
  console.log('\n--- Importing appointments ---');
  let appointmentCount = 0;
  let appointmentSkipped = 0;
  let appointmentErrors = 0;
  let appointments2026Confirmed = 0;
  let appointments2026Pending = 0;
  
  const statusMap = {
    'accepted': 'confirmed',
    'pending': 'pending',
    'cancelled_by_seller': 'cancelled',
    'cancelled_by_buyer': 'cancelled',
    'noshow': 'cancelled',
    'completed': 'completed',
  };
  
  for (const row of appointmentRows) {
    try {
      const startParsed = parseDateTime(row['start']);
      
      if (!startParsed) {
        appointmentSkipped++;
        continue;
      }
      
      const endParsed = parseDateTime(row['end']);
      const appointmentYear = parseInt(startParsed.date.substring(0, 4));
      
      let customerId = null;
      
      if (row['client_email']) {
        customerId = customerIdMap.get(row['client_email'].toLowerCase().trim());
      }
      
      if (!customerId && row['client_name']) {
        customerId = customerIdMap.get(row['client_name'].toLowerCase().trim());
      }
      
      const rawStatus = row['status']?.toLowerCase().trim();
      const mappedStatus = statusMap[rawStatus] || 'pending';
      
      if (appointmentYear === 2026) {
        if (mappedStatus === 'confirmed') appointments2026Confirmed++;
        if (mappedStatus === 'pending') appointments2026Pending++;
      }
      
      await db.insert(schema.bookings).values({
        squareAppointmentId: row['appointment_id'] || null,
        customerId: customerId,
        status: mappedStatus,
        scheduledDate: startParsed.date,
        startTime: startParsed.time,
        endTime: endParsed?.time || null,
        address: row['address']?.trim() || null,
        noteFromClient: row['note_from_client']?.trim() || null,
        noteFromBusiness: row['note_from_business']?.trim() || null,
      });
      
      appointmentCount++;
      if (appointmentCount % 2000 === 0) {
        console.log(`  Imported ${appointmentCount} appointments...`);
      }
    } catch (error) {
      if (error.message.includes('duplicate')) {
        appointmentSkipped++;
      } else {
        appointmentErrors++;
      }
    }
  }
  
  console.log(`\nAppointments imported: ${appointmentCount}`);
  console.log(`Appointments skipped (duplicates/no date): ${appointmentSkipped}`);
  console.log(`Appointment errors: ${appointmentErrors}`);
  console.log(`\n2026 confirmed appointments: ${appointments2026Confirmed}`);
  console.log(`2026 pending appointments: ${appointments2026Pending}`);
  
  const dbCustomerCount = await db.execute(sql`SELECT COUNT(*) as count FROM customers`);
  const dbBookingCount = await db.execute(sql`SELECT COUNT(*) as count FROM bookings`);
  const db2026Count = await db.execute(sql`SELECT COUNT(*) as count FROM bookings WHERE scheduled_date >= '2026-01-01'`);
  
  console.log('\n--- Database counts ---');
  console.log(`Total customers in DB: ${dbCustomerCount.rows[0].count}`);
  console.log(`Total bookings in DB: ${dbBookingCount.rows[0].count}`);
  console.log(`2026+ bookings in DB: ${db2026Count.rows[0].count}`);
  
  console.log('\n--- Import complete! ---');
  await pool.end();
}

importData().catch(console.error);
