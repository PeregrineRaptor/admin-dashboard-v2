export async function geocodeAddress(streetAddress, city, state, postalCode, country = 'Canada') {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return null;
  }

  const addressParts = [streetAddress, city, state, postalCode, country].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  if (!fullAddress || fullAddress.trim() === country) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      
      let extractedCity = null;
      let extractedPostalCode = null;

      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          extractedCity = component.long_name;
        }
        if (component.types.includes('sublocality_level_1') && !extractedCity) {
          extractedCity = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          extractedPostalCode = component.long_name;
        }
      }

      return {
        latitude: lat,
        longitude: lng,
        city: extractedCity,
        postalCode: extractedPostalCode,
        formattedAddress: result.formatted_address,
      };
    }

    console.warn('Geocoding failed for address:', fullAddress, 'Status:', data.status);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
