import { getSquareTeamMembers } from '@/lib/square';

export async function GET() {
  try {
    const teamMembers = await getSquareTeamMembers();
    
    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      givenName: member.givenName,
      familyName: member.familyName,
      displayName: `${member.givenName || ''} ${member.familyName || ''}`.trim(),
      email: member.emailAddress,
      phone: member.phoneNumber,
      status: member.status,
      isOwner: member.isOwner,
      createdAt: member.createdAt,
    }));
    
    return Response.json({
      success: true,
      count: formattedMembers.length,
      teamMembers: formattedMembers,
    });
  } catch (error) {
    console.error('Error fetching Square team:', error);
    return Response.json({ 
      error: 'Failed to fetch team members from Square',
      details: error.message 
    }, { status: 500 });
  }
}
