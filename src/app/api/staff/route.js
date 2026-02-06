import { db } from '@/lib/db';
import { users, staffStats, crewMembers, crews } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const allStaff = await db
      .select({
        user: users,
        stats: staffStats,
      })
      .from(users)
      .leftJoin(staffStats, eq(users.id, staffStats.userId))
      .orderBy(desc(users.xp));
    
    const staffWithCrews = await Promise.all(
      allStaff.map(async (s) => {
        const crewMembership = await db
          .select({
            crewMember: crewMembers,
            crew: crews,
          })
          .from(crewMembers)
          .leftJoin(crews, eq(crewMembers.crewId, crews.id))
          .where(eq(crewMembers.userId, s.user.id));
        
        const { passwordHash, ...userWithoutPassword } = s.user;
        
        return {
          ...userWithoutPassword,
          stats: s.stats,
          crews: crewMembership.map(cm => ({
            ...cm.crewMember,
            crew: cm.crew,
          })),
        };
      })
    );
    
    return Response.json(staffWithCrews);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return Response.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.email || !data.firstName) {
      return Response.json({ error: 'Email and first name are required' }, { status: 400 });
    }
    
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);
    
    if (existingUser.length > 0) {
      return Response.json({ error: 'A staff member with this email already exists' }, { status: 400 });
    }
    
    const passwordHash = await bcrypt.hash(data.password || 'changeme123', 10);
    
    const [user] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role || 'service_provider',
      avatarUrl: data.avatarUrl,
      isActive: data.isActive !== false,
      payType: data.payType || 'hourly',
      payRate: data.payRate ? String(data.payRate) : null,
    }).returning();
    
    await db.insert(staffStats).values({
      userId: user.id,
    });
    
    if (data.crewId) {
      await db.insert(crewMembers).values({
        userId: user.id,
        crewId: data.crewId,
        role: 'member',
      });
    }
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return Response.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return Response.json({ error: 'Failed to create staff' }, { status: 500 });
  }
}
