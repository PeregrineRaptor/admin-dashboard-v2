import { db } from '@/lib/db';
import { crewCitySchedules, cities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const crewId = parseInt(id);

    const schedules = await db.select({
      id: crewCitySchedules.id,
      crewId: crewCitySchedules.crewId,
      cityId: crewCitySchedules.cityId,
      dayOfWeek: crewCitySchedules.dayOfWeek,
      cityName: cities.name,
    })
    .from(crewCitySchedules)
    .leftJoin(cities, eq(crewCitySchedules.cityId, cities.id))
    .where(eq(crewCitySchedules.crewId, crewId));

    const groupedByCityId = {};
    for (const schedule of schedules) {
      if (!groupedByCityId[schedule.cityId]) {
        groupedByCityId[schedule.cityId] = {
          cityId: schedule.cityId,
          cityName: schedule.cityName,
          days: [],
        };
      }
      groupedByCityId[schedule.cityId].days.push(schedule.dayOfWeek);
    }

    const result = Object.values(groupedByCityId).map(city => ({
      ...city,
      days: city.days.sort((a, b) => a - b),
    }));

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching crew schedules:', error);
    return Response.json({ error: 'Failed to fetch crew schedules' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const crewId = parseInt(id);
    const body = await request.json();
    const { citySchedules } = body;

    await db.delete(crewCitySchedules).where(eq(crewCitySchedules.crewId, crewId));

    if (citySchedules && citySchedules.length > 0) {
      const newSchedules = [];
      for (const citySchedule of citySchedules) {
        for (const day of citySchedule.days) {
          newSchedules.push({
            crewId,
            cityId: citySchedule.cityId,
            dayOfWeek: day,
          });
        }
      }
      
      if (newSchedules.length > 0) {
        await db.insert(crewCitySchedules).values(newSchedules);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating crew schedules:', error);
    return Response.json({ error: 'Failed to update crew schedules' }, { status: 500 });
  }
}
