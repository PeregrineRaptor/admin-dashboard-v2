import 'dotenv/config';
import { db } from '../src/lib/db/index.js';
import { customers, customerProperties } from '../src/lib/db/schema.js';
import { eq, or, isNull, sql } from 'drizzle-orm';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function geocodeAddress(address, province, country = 'Canada') {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const fullAddress = `${address}, ${province}, ${country}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    const result = data.results[0];
    let city = null;
    let postalCode = null;

    for (const component of result.address_components) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('sublocality_level_1') && !city) {
        city = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    }

    return { city, postalCode, formattedAddress: result.formatted_address };
  }

  return null;
}

async function fixMissingCities() {
  console.log('Fetching records with missing cities...\n');

  const propertiesMissingCity = await db.select({
    id: customerProperties.id,
    streetAddress1: customerProperties.streetAddress1,
    city: customerProperties.city,
    state: customerProperties.state,
    postalCode: customerProperties.postalCode,
  })
  .from(customerProperties)
  .where(or(isNull(customerProperties.city), sql`${customerProperties.city} = ''`));

  const customersMissingCity = await db.select({
    id: customers.id,
    firstName: customers.firstName,
    lastName: customers.lastName,
    streetAddress1: customers.streetAddress1,
    city: customers.city,
    state: customers.state,
    postalCode: customers.postalCode,
  })
  .from(customers)
  .where(or(isNull(customers.city), sql`${customers.city} = ''`));

  console.log(`Found ${propertiesMissingCity.length} properties missing city`);
  console.log(`Found ${customersMissingCity.length} customers missing city\n`);

  let propertiesUpdated = 0;
  let customersUpdated = 0;

  for (const prop of propertiesMissingCity) {
    if (!prop.streetAddress1) {
      console.log(`  Property ${prop.id}: No address to geocode`);
      continue;
    }

    try {
      console.log(`  Geocoding property ${prop.id}: ${prop.streetAddress1}`);
      const result = await geocodeAddress(prop.streetAddress1, prop.state || 'Ontario');
      
      if (result && result.city) {
        const updateData = { city: result.city };
        if (!prop.postalCode && result.postalCode) {
          updateData.postalCode = result.postalCode;
        }
        await db.update(customerProperties)
          .set(updateData)
          .where(eq(customerProperties.id, prop.id));
        console.log(`    -> Updated to: ${result.city}`);
        propertiesUpdated++;
      } else {
        console.log(`    -> Could not determine city`);
      }
    } catch (err) {
      console.log(`    -> Error: ${err.message}`);
    }
  }

  console.log('\nFixing customers...\n');

  for (const cust of customersMissingCity) {
    if (!cust.streetAddress1) {
      console.log(`  Customer ${cust.id} (${cust.firstName} ${cust.lastName}): No address to geocode`);
      continue;
    }

    try {
      console.log(`  Geocoding customer ${cust.id} (${cust.firstName} ${cust.lastName}): ${cust.streetAddress1}`);
      const result = await geocodeAddress(cust.streetAddress1, cust.state || 'Ontario');
      
      if (result && result.city) {
        const updateData = { city: result.city };
        if (!cust.postalCode && result.postalCode) {
          updateData.postalCode = result.postalCode;
        }
        await db.update(customers)
          .set(updateData)
          .where(eq(customers.id, cust.id));
        console.log(`    -> Updated to: ${result.city}`);
        customersUpdated++;
      } else {
        console.log(`    -> Could not determine city`);
      }
    } catch (err) {
      console.log(`    -> Error: ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Properties updated: ${propertiesUpdated}/${propertiesMissingCity.length}`);
  console.log(`Customers updated: ${customersUpdated}/${customersMissingCity.length}`);
}

fixMissingCities()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
