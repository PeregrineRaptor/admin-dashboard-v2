import { db } from '@/lib/db';
import { users, crews } from '@/lib/db/schema';
import { getSquareTeamMembers } from '@/lib/square';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CREW_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function isCrewName(name) {
  const crewPatterns = ['crew', 'squad', 'team'];
  return crewPatterns.some(pattern => name.toLowerCase().includes(pattern));
}

function generateSecurePassword() {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    const teamMembers = await getSquareTeamMembers();
    
    const results = {
      staff: { created: 0, updated: 0 },
      crews: { created: 0, updated: 0 },
    };
    
    let colorIndex = 0;
    
    for (const member of teamMembers) {
      const displayName = `${member.givenName || ''} ${member.familyName || ''}`.trim();
      const isCrew = isCrewName(displayName);
      
      if (isCrew) {
        const existingCrew = await db.select().from(crews)
          .where(eq(crews.squareId, member.id))
          .limit(1);
        
        if (existingCrew.length > 0) {
          await db.update(crews)
            .set({
              name: displayName,
              isActive: member.status === 'ACTIVE',
            })
            .where(eq(crews.squareId, member.id));
          results.crews.updated++;
        } else {
          await db.insert(crews).values({
            squareId: member.id,
            name: displayName,
            color: CREW_COLORS[colorIndex % CREW_COLORS.length],
            isActive: member.status === 'ACTIVE',
          });
          colorIndex++;
          results.crews.created++;
        }
      } else {
        const existingUser = await db.select().from(users)
          .where(eq(users.squareId, member.id))
          .limit(1);
        
        if (existingUser.length > 0) {
          await db.update(users)
            .set({
              firstName: member.givenName,
              lastName: member.familyName,
              phone: member.phoneNumber,
              isActive: member.status === 'ACTIVE',
            })
            .where(eq(users.squareId, member.id));
          results.staff.updated++;
        } else {
          const email = member.emailAddress || `${member.id}@placeholder.local`;
          
          const existingEmail = await db.select().from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (existingEmail.length > 0) {
            await db.update(users)
              .set({
                squareId: member.id,
                firstName: member.givenName,
                lastName: member.familyName,
                phone: member.phoneNumber,
                isActive: member.status === 'ACTIVE',
              })
              .where(eq(users.email, email));
            results.staff.updated++;
          } else {
            const securePassword = await bcrypt.hash(generateSecurePassword(), 10);
            await db.insert(users).values({
              squareId: member.id,
              email: email,
              passwordHash: securePassword,
              firstName: member.givenName,
              lastName: member.familyName,
              phone: member.phoneNumber,
              role: member.isOwner ? 'admin' : 'service_provider',
              isActive: member.status === 'ACTIVE',
            });
            results.staff.created++;
          }
        }
      }
    }
    
    return Response.json({
      success: true,
      message: 'Square sync completed',
      results,
      totalSquareMembers: teamMembers.length,
    });
  } catch (error) {
    console.error('Error syncing Square data:', error);
    return Response.json({ 
      error: 'Failed to sync Square data',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    const teamMembers = await getSquareTeamMembers();
    
    const preview = {
      staff: [],
      crews: [],
    };
    
    for (const member of teamMembers) {
      const displayName = `${member.givenName || ''} ${member.familyName || ''}`.trim();
      const isCrew = isCrewName(displayName);
      
      const item = {
        squareId: member.id,
        name: displayName,
        email: member.emailAddress,
        phone: member.phoneNumber,
        status: member.status,
        isOwner: member.isOwner,
      };
      
      if (isCrew) {
        preview.crews.push(item);
      } else {
        preview.staff.push(item);
      }
    }
    
    return Response.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error('Error previewing Square data:', error);
    return Response.json({ 
      error: 'Failed to preview Square data',
      details: error.message 
    }, { status: 500 });
  }
}
