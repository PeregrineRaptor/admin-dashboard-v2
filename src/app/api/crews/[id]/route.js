import { db } from '@/lib/db';
import { crews, crewMembers, crewCitySchedules, crewServices, users, cities, services } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const [crew] = await db.select().from(crews).where(eq(crews.id, id));
    
    if (!crew) {
      return Response.json({ error: 'Crew not found' }, { status: 404 });
    }
    
    const members = await db
      .select({
        member: crewMembers,
        user: users,
      })
      .from(crewMembers)
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .where(eq(crewMembers.crewId, id));
    
    const schedules = await db
      .select({
        schedule: crewCitySchedules,
        city: cities,
      })
      .from(crewCitySchedules)
      .leftJoin(cities, eq(crewCitySchedules.cityId, cities.id))
      .where(eq(crewCitySchedules.crewId, id));
    
    const crewServicesData = await db
      .select({
        crewService: crewServices,
        service: services,
      })
      .from(crewServices)
      .leftJoin(services, eq(crewServices.serviceId, services.id))
      .where(eq(crewServices.crewId, id));
    
    return Response.json({
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
    });
  } catch (error) {
    console.error('Error fetching crew:', error);
    return Response.json({ error: 'Failed to fetch crew' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.maxDailyProduction !== undefined) updateData.maxDailyProduction = data.maxDailyProduction;
    if (data.workingDays !== undefined) updateData.workingDays = data.workingDays;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    const [updated] = await db.update(crews)
      .set(updateData)
      .where(eq(crews.id, id))
      .returning();
    
    if (!updated) {
      return Response.json({ error: 'Crew not found' }, { status: 404 });
    }
    
    if (data.serviceIds !== undefined) {
      await db.delete(crewServices).where(eq(crewServices.crewId, id));
      if (data.serviceIds.length > 0) {
        await db.insert(crewServices).values(
          data.serviceIds.map(serviceId => ({
            crewId: id,
            serviceId,
          }))
        );
      }
    }
    
    if (data.memberIds !== undefined) {
      await db.delete(crewMembers).where(eq(crewMembers.crewId, id));
      if (data.memberIds.length > 0) {
        await db.insert(crewMembers).values(
          data.memberIds.map(userId => ({
            crewId: id,
            userId,
            role: 'member',
          }))
        );
      }
    }
    
    return Response.json(updated);
  } catch (error) {
    console.error('Error updating crew:', error);
    return Response.json({ error: 'Failed to update crew' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    await db.delete(crewServices).where(eq(crewServices.crewId, id));
    await db.delete(crewCitySchedules).where(eq(crewCitySchedules.crewId, id));
    await db.delete(crewMembers).where(eq(crewMembers.crewId, id));
    await db.delete(crews).where(eq(crews.id, id));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting crew:', error);
    return Response.json({ error: 'Failed to delete crew' }, { status: 500 });
  }
}
