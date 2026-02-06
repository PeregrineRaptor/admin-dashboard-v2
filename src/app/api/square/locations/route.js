import { getSquareLocations } from '@/lib/square';

export async function GET() {
  try {
    const locations = await getSquareLocations();
    
    const formattedLocations = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      timezone: loc.timezone,
      status: loc.status,
    }));
    
    return Response.json({
      success: true,
      count: formattedLocations.length,
      locations: formattedLocations,
    });
  } catch (error) {
    console.error('Error fetching Square locations:', error);
    return Response.json({ 
      error: 'Failed to fetch locations from Square',
      details: error.message 
    }, { status: 500 });
  }
}
