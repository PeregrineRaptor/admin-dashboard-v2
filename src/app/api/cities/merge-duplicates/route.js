import { db } from '@/lib/db';
import { cities, crewCitySchedules } from '@/lib/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';

export async function POST(request) {
  try {
    const duplicates = await db.execute(sql`
      SELECT LOWER(TRIM(name)) as norm_name, LOWER(TRIM(province)) as norm_province, 
             array_agg(id ORDER BY id) as ids, COUNT(*) as count
      FROM cities
      GROUP BY LOWER(TRIM(name)), LOWER(TRIM(province))
      HAVING COUNT(*) > 1
      ORDER BY norm_name
    `);
    
    let mergedCount = 0;
    let deletedCount = 0;
    const mergeDetails = [];
    
    for (const dup of duplicates.rows) {
      const ids = dup.ids;
      const keepId = ids[0];
      const deleteIds = ids.slice(1);
      
      await db.transaction(async (tx) => {
        await tx.update(crewCitySchedules)
          .set({ cityId: keepId })
          .where(inArray(crewCitySchedules.cityId, deleteIds));
        
        await tx.delete(cities)
          .where(inArray(cities.id, deleteIds));
      });
      
      mergedCount++;
      deletedCount += deleteIds.length;
      
      mergeDetails.push({
        city: `${dup.norm_name}, ${dup.norm_province || 'N/A'}`,
        kept: keepId,
        deleted: deleteIds,
      });
    }
    
    const [remaining] = await db.select({ count: sql`count(*)` }).from(cities);
    
    return Response.json({
      success: true,
      mergedGroups: mergedCount,
      deletedRecords: deletedCount,
      remainingCities: parseInt(remaining.count),
      details: mergeDetails,
    });
  } catch (error) {
    console.error('Error merging duplicate cities:', error);
    return Response.json({ error: 'Failed to merge duplicates: ' + error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const duplicates = await db.execute(sql`
      SELECT LOWER(TRIM(name)) as norm_name, LOWER(TRIM(province)) as norm_province,
             array_agg(id ORDER BY id) as ids, COUNT(*) as count
      FROM cities
      GROUP BY LOWER(TRIM(name)), LOWER(TRIM(province))
      HAVING COUNT(*) > 1
      ORDER BY count DESC, norm_name
    `);
    
    const [totalCities] = await db.select({ count: sql`count(*)` }).from(cities);
    
    return Response.json({
      duplicateGroups: duplicates.rows.length,
      totalDuplicateRecords: duplicates.rows.reduce((acc, d) => acc + (parseInt(d.count) - 1), 0),
      totalCities: parseInt(totalCities.count),
      duplicates: duplicates.rows.map(d => ({
        name: d.norm_name,
        province: d.norm_province,
        count: parseInt(d.count),
        ids: d.ids,
      })),
    });
  } catch (error) {
    console.error('Error checking duplicate cities:', error);
    return Response.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
