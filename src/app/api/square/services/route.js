import { getSquareServices } from '@/lib/square';

export async function GET() {
  try {
    const services = await getSquareServices();
    
    const formattedServices = services.map(item => ({
      id: item.id,
      name: item.itemData?.name,
      description: item.itemData?.description,
      variations: item.itemData?.variations?.map(v => ({
        id: v.id,
        name: v.itemVariationData?.name,
        price: v.itemVariationData?.priceMoney ? 
          Number(v.itemVariationData.priceMoney.amount) / 100 : null,
      })) || [],
    }));
    
    return Response.json({
      success: true,
      count: formattedServices.length,
      services: formattedServices,
    });
  } catch (error) {
    console.error('Error fetching Square services:', error);
    return Response.json({ 
      error: 'Failed to fetch services from Square',
      details: error.message 
    }, { status: 500 });
  }
}
