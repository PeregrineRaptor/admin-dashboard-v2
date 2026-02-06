import { db } from '@/lib/db';
import { crews, crewMembers, crewCitySchedules, crewServices, users, cities, services } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request) {
  try {
    const allCrews = await db.select().from(crews);
    
    const crewsWithDetails = await Promise.all(
      allCrews.map(async (crew) => {
        const members = await db
          .select({
            member: crewMembers,
            user: users,
          })
          .from(crewMembers)
          .leftJoin(users, eq(crewMembers.userId, users.id))
          .where(eq(crewMembers.crewId, crew.id));
        
        const schedules = await db
          .select({
            schedule: crewCitySchedules,
            city: cities,
          })
          .from(crewCitySchedules)
          .leftJoin(cities, eq(crewCitySchedules.cityId, cities.id))
          .where(eq(crewCitySchedules.crewId, crew.id));
        
        const crewServicesData = await db
          .select({
            crewService: crewServices,
            service: services,
          })
          .from(crewServices)
          .leftJoin(services, eq(crewServices.serviceId, services.id))
          .where(eq(crewServices.crewId, crew.id));
        
        return {
          ...crew,
          members: members.map(m => ({
            ...m.member,
            user: m.user,
          })),
          citySchedules: schedules.map(s => ({
            ...s.schedule,
            city: s.city,
          })),
          services: crewServicesData.map(cs => cs.service),
        };
      })
    );
    
    return Response.json(crewsWithDetails);
  } catch (error) {
    console.error('Error fetching crews:', error);
    return Response.json({ error: 'Failed to fetch crews' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const [crew] = await db.insert(crews).values({
      name: data.name,
      color: data.color || '#3B82F6',
      maxDailyProduction: data.maxDailyProduction || '2000.00',
      isActive: data.isActive !== false,
    }).returning();
    
    return Response.json(crew, { status: 201 });
  } catch (error) {
    console.error('Error creating crew:', error);
    return Response.json({ error: 'Failed to create crew' }, { status: 500 });
  }
}
