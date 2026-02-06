import { db } from '@/lib/db';
import { bookings, crews, crewCitySchedules, cities, crewServices } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { customerId, city, serviceIds } = await request.json();
    
    console.log('[Recommendations] Request:', { customerId, city, serviceIds });
    
    if (!city || !serviceIds || serviceIds.length === 0) {
      console.log('[Recommendations] Missing data - city:', city, 'serviceIds:', serviceIds);
      return Response.json({
        recommendations: [],
        message: "Please select a service and ensure a city is available",
        analysis: `Both service and city are required. Received: city="${city || 'none'}", services=${serviceIds?.length || 0}`,
      });
    }
    
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    const startDate = today.toISOString().split("T")[0];
    const endDate = twoWeeksLater.toISOString().split("T")[0];
    
    const allCrews = await db.select().from(crews);
    
    const crewServiceMappings = await db.select()
      .from(crewServices)
      .where(inArray(crewServices.serviceId, serviceIds));
    
    const crewsCanDoService = new Set(crewServiceMappings.map(cs => cs.crewId));
    
    const eligibleCrews = allCrews.filter(crew => crewsCanDoService.has(crew.id));
    
    console.log('[Recommendations] Crews that can do service:', eligibleCrews.map(c => c.name));
    
    if (eligibleCrews.length === 0) {
      return Response.json({
        recommendations: [],
        message: "No crews available for the selected service",
        analysis: `No crews are configured to perform the selected service(s). Service IDs checked: ${serviceIds.join(', ')}`,
      });
    }
    
    const existingBookings = await db.select({
      scheduledDate: bookings.scheduledDate,
      crewId: bookings.crewId,
      totalAmount: bookings.totalAmount,
    })
      .from(bookings)
      .where(
        and(
          gte(bookings.scheduledDate, startDate),
          lte(bookings.scheduledDate, endDate)
        )
      );
    
    const citySchedules = city ? await db.select({
      schedule: crewCitySchedules,
      city: cities,
      crew: crews,
    })
      .from(crewCitySchedules)
      .leftJoin(cities, eq(crewCitySchedules.cityId, cities.id))
      .leftJoin(crews, eq(crewCitySchedules.crewId, crews.id))
      .where(sql`
        LOWER(${cities.name}) = LOWER(${city})
        OR ${cities.id} = (SELECT parent_id FROM cities WHERE LOWER(name) = LOWER(${city}) AND parent_id IS NOT NULL LIMIT 1)
        OR ${cities.id} IN (SELECT id FROM cities WHERE parent_id = (SELECT id FROM cities WHERE LOWER(name) = LOWER(${city}) LIMIT 1))
      `)
    : [];
    
    console.log('[Recommendations] City schedules found:', citySchedules.length, 'for city:', city);
    console.log('[Recommendations] Schedule details:', citySchedules.map(cs => ({
      crew: cs.crew?.name,
      city: cs.city?.name,
      dayOfWeek: cs.schedule?.dayOfWeek,
      dayName: DAY_NAMES[cs.schedule?.dayOfWeek]
    })));
    
    const productionByDateAndCrew = {};
    existingBookings.forEach(b => {
      const key = `${b.scheduledDate}-${b.crewId}`;
      if (!productionByDateAndCrew[key]) {
        productionByDateAndCrew[key] = 0;
      }
      productionByDateAndCrew[key] += parseFloat(b.totalAmount) || 0;
    });
    
    const crewAvailability = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayIndex = date.getDay();
      const dayName = DAY_NAMES[dayIndex];
      
      eligibleCrews.forEach(crew => {
        const key = `${dateStr}-${crew.id}`;
        const currentProduction = productionByDateAndCrew[key] || 0;
        const maxProduction = parseFloat(crew.maxDailyProduction) || 2000;
        const available = currentProduction < maxProduction;
        
        const crewInCity = citySchedules.some(
          cs => cs.schedule?.crewId === crew.id && cs.schedule?.dayOfWeek === dayIndex
        );
        
        crewAvailability.push({
          date: dateStr,
          dayName,
          crewId: crew.id,
          crewName: crew.name,
          currentProduction: currentProduction.toFixed(2),
          maxProduction: maxProduction.toFixed(2),
          available,
          capacityRemaining: (maxProduction - currentProduction).toFixed(2),
          servesCity: crewInCity,
        });
      });
    }
    
    const availableDays = crewAvailability.filter(a => a.available && a.servesCity);
    
    console.log('[Recommendations] Available days found:', availableDays.length);
    
    if (availableDays.length === 0) {
      const crewsServingCity = [...new Set(citySchedules.filter(cs => cs.crew).map(cs => cs.crew?.name))];
      const eligibleCrewNames = eligibleCrews.map(c => c.name);
      const crewsInBoth = eligibleCrewNames.filter(name => crewsServingCity.includes(name));
      
      let analysis = `Searched for crews in "${city}" that can do the selected service. `;
      if (citySchedules.length === 0) {
        analysis += `No crews are scheduled to serve ${city}. `;
      } else if (crewsInBoth.length === 0) {
        analysis += `Crews serving ${city}: ${crewsServingCity.join(', ') || 'none'}. Crews that do this service: ${eligibleCrewNames.join(', ') || 'none'}. No overlap found.`;
      } else {
        analysis += `${crewsInBoth.join(', ')} can do the service in ${city}, but are fully booked.`;
      }
      
      console.log('[Recommendations] No slots - reason:', analysis);
      
      return Response.json({
        recommendations: [],
        message: "No available slots found in the next 2 weeks",
        analysis,
      });
    }
    
    const scheduleContext = availableDays.slice(0, 20).map(a => 
      `${a.date} (${a.dayName}): ${a.crewName} has $${a.capacityRemaining} of $${a.maxProduction} capacity remaining (current: $${a.currentProduction})`
    ).join("\n");
    
    const cityContext = city ? `Customer is located in ${city}.` : "";
    const crewCityContext = citySchedules.length > 0 
      ? `Crews scheduled for ${city}: ${[...new Set(citySchedules.filter(cs => cs.crew).map(cs => `${cs.crew?.name} on ${DAY_NAMES[cs.schedule?.dayOfWeek]}s`))].join(", ")}`
      : "";
    
    const prompt = `You are a scheduling assistant for a cleaning service company. Analyze the crew availability and recommend the best 3 days for a new appointment.

${cityContext}
${crewCityContext}

Available capacity in the next 2 weeks (crews that can perform the selected service and serve this city):
${scheduleContext}

Consider:
1. Only recommend crews that serve the customer's city on that day
2. Recommend days where crews have more production capacity remaining
3. Spread recommendations across different days of the week for flexibility
4. Earlier dates are generally preferred
5. Don't recommend crews that are at or over their daily production limit

Respond with a JSON object containing:
{
  "recommendations": [
    { "date": "YYYY-MM-DD", "reason": "Brief reason why this is a good day", "crewName": "Recommended crew name" }
  ],
  "analysis": "Brief 1-2 sentence summary of the scheduling situation"
}

Limit to 3 recommendations max.`;

    let result = { recommendations: [], analysis: "" };
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      });
      
      console.log('[Recommendations] OpenAI raw response:', completion.choices[0]?.message?.content);
      result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch (aiError) {
      console.error('[Recommendations] OpenAI error:', aiError.message);
    }
    
    if (!result.recommendations || result.recommendations.length === 0) {
      console.log('[Recommendations] Using fallback - converting available days to recommendations');
      const fallbackRecs = availableDays.slice(0, 3).map(day => ({
        date: day.date,
        reason: `${day.crewName} available with $${day.capacityRemaining} capacity`,
        crewName: day.crewName,
      }));
      
      return Response.json({
        recommendations: fallbackRecs,
        analysis: `Found ${availableDays.length} available slot(s) in ${city}. Showing top options.`,
        availableDays: availableDays.slice(0, 10),
      });
    }
    
    return Response.json({
      recommendations: result.recommendations || [],
      analysis: result.analysis || "AI analysis complete",
      availableDays: availableDays.slice(0, 10),
    });
  } catch (error) {
    console.error('Error generating booking recommendations:', error);
    return Response.json({ 
      error: 'Failed to generate recommendations',
      recommendations: [],
      analysis: "Unable to analyze schedule at this time.",
    }, { status: 500 });
  }
}
