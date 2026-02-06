import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set');
  process.exit(1);
}

async function geocodeAddress(streetAddress, city, state, postalCode, country = 'Canada') {
  const addressParts = [streetAddress, city, state, postalCode, country].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  if (!fullAddress || fullAddress.trim() === country) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

async function main() {
  const batchSize = 50;
  let totalUpdated = 0;
  let totalFailed = 0;
  
  console.log('Starting geocode backfill...');
  
  while (true) {
    const { rows: properties } = await pool.query(`
      SELECT id, street_address_1, city, state, postal_code, country 
      FROM customer_properties 
      WHERE latitude IS NULL OR longitude IS NULL 
      LIMIT $1
    `, [batchSize]);
    
    if (properties.length === 0) {
      console.log('No more properties to geocode');
      break;
    }
    
    console.log(`Processing batch of ${properties.length} properties...`);
    
    for (const prop of properties) {
      if (!prop.street_address_1) {
        totalFailed++;
        continue;
      }
      
      try {
        const result = await geocodeAddress(
          prop.street_address_1,
          prop.city,
          prop.state,
          prop.postal_code,
          prop.country || 'Canada'
        );
        
        if (result && result.latitude && result.longitude) {
          await pool.query(`
            UPDATE customer_properties 
            SET latitude = $1, longitude = $2
            WHERE id = $3
          `, [result.latitude, result.longitude, prop.id]);
          totalUpdated++;
          process.stdout.write('.');
        } else {
          totalFailed++;
          process.stdout.write('x');
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        totalFailed++;
        console.error(`Error for property ${prop.id}:`, err.message);
      }
    }
    
    console.log(`\nBatch complete. Total updated: ${totalUpdated}, failed: ${totalFailed}`);
  }
  
  console.log(`\nBackfill complete! Updated: ${totalUpdated}, Failed: ${totalFailed}`);
  await pool.end();
}

main().catch(console.error);
