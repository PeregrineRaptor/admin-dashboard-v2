import { db } from '@/lib/db';
import { users, staffStats, crewMembers, crews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const [staff] = await db
      .select({
        user: users,
        stats: staffStats,
      })
      .from(users)
      .leftJoin(staffStats, eq(users.id, staffStats.userId))
      .where(eq(users.id, id));
    
    if (!staff) {
      return Response.json({ error: 'Staff not found' }, { status: 404 });
    }
    
    const crewMembership = await db
      .select({
        crewMember: crewMembers,
        crew: crews,
      })
      .from(crewMembers)
      .leftJoin(crews, eq(crewMembers.crewId, crews.id))
      .where(eq(crewMembers.userId, id));
    
    const { passwordHash, ...userWithoutPassword } = staff.user;
    
    return Response.json({
      ...userWithoutPassword,
      stats: staff.stats,
      crews: crewMembership.map(cm => ({
        ...cm.crewMember,
        crew: cm.crew,
      })),
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return Response.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    
    const [updated] = await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email?.toLowerCase(),
        phone: data.phone,
        role: data.role,
        isActive: data.isActive,
        payType: data.payType || 'hourly',
        payRate: data.payRate ? parseFloat(data.payRate) : null,
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updated) {
      return Response.json({ error: 'Staff not found' }, { status: 404 });
    }
    
    if (data.crewId !== undefined) {
      await db.delete(crewMembers).where(eq(crewMembers.userId, id));
      
      if (data.crewId) {
        await db.insert(crewMembers).values({
          userId: id,
          crewId: parseInt(data.crewId),
          role: 'member',
        });
      }
    }
    
    const { passwordHash, ...userWithoutPassword } = updated;
    return Response.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating staff:', error);
    return Response.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    await db.delete(crewMembers).where(eq(crewMembers.userId, id));
    await db.delete(staffStats).where(eq(staffStats.userId, id));
    
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    if (!deleted) {
      return Response.json({ error: 'Staff not found' }, { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return Response.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
