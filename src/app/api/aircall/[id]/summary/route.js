import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const AIRCALL_API_URL = 'https://api.aircall.io/v1';

function getAuthHeader() {
  const apiId = process.env.AIRCALL_API_ID;
  const apiToken = process.env.AIRCALL_API_TOKEN;
  
  if (!apiId || !apiToken) {
    throw new Error('Aircall API credentials not configured');
  }
  
  const encoded = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
  return `Basic ${encoded}`;
}

const BUSINESS_CONTEXT = `
This is a CRM for Raptor The Luxury Brand, a high-end cleaning service company. 
Calls typically fall into these categories:
1. QUOTE - Customer requesting pricing or estimates for cleaning services
2. BOOKING - Scheduling, rescheduling, or canceling cleaning appointments
3. INVOICE - Questions about outstanding invoices, payments, or billing
4. INQUIRY - General questions about services, availability, or other topics
`;

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'detailed';
    
    const response = await fetch(`${AIRCALL_API_URL}/calls/${id}`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch call details' }, { status: response.status });
    }
    
    const data = await response.json();
    const call = data.call;
    
    if (!call) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }

    const callerName = call.contact
      ? [call.contact.first_name, call.contact.last_name].filter(Boolean).join(' ')
      : call.raw_digits || 'Unknown caller';
    
    const agentName = call.user?.name || 'Unknown agent';
    const duration = call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A';
    const direction = call.direction === 'inbound' ? 'incoming' : 'outgoing';
    const status = call.status === 'done' ? 'completed' : (call.missed_call_reason || call.status);
    
    const callContext = `
Call Details:
- Direction: ${direction}
- Caller: ${callerName}
- Agent: ${agentName}
- Duration: ${duration}
- Status: ${status}
- Date: ${new Date(call.started_at * 1000).toLocaleString()}
${call.transcript ? `\nTranscript:\n${call.transcript}` : ''}
${call.voicemail ? '\nThis call went to voicemail.' : ''}
${call.tags?.length > 0 ? `\nTags: ${call.tags.map(t => t.name).join(', ')}` : ''}
${call.comments?.length > 0 ? `\nNotes: ${call.comments.map(c => c.content).join('; ')}` : ''}
`;

    let prompt;
    if (type === 'short') {
      prompt = `${BUSINESS_CONTEXT}

Based on this phone call, categorize it and provide a brief summary.

${callContext}

Respond in this exact format (no markdown, just plain text):
[CATEGORY] - Brief description (max 10 words)

Where CATEGORY is one of: QUOTE, BOOKING, INVOICE, INQUIRY, MISSED, or VOICEMAIL

Examples:
QUOTE - Requesting window cleaning estimate for 3-bed home
BOOKING - Rescheduling Thursday appointment to Friday
INVOICE - Asking about $450 outstanding balance
INQUIRY - Questions about service areas
MISSED - Missed call, no voicemail
VOICEMAIL - Left message about upcoming appointment`;
    } else {
      prompt = `${BUSINESS_CONTEXT}

Analyze this phone call and provide a detailed summary for the CRM team.

${callContext}

Provide your analysis in this markdown format:

## Call Category
State the category: **QUOTE**, **BOOKING**, **INVOICE**, or **INQUIRY**
(If missed call or voicemail, note that instead)

## Summary
2-3 sentences describing what the call was about and the outcome.

## Key Details
- List specific details discussed (services mentioned, dates, amounts, addresses, etc.)
- Include any customer preferences or special requests
- Note any concerns or issues raised

## Action Items
- List any follow-up tasks needed (e.g., "Send quote for window cleaning", "Update booking to Friday", "Send invoice reminder")
- If no action needed, write "No immediate action required"

## Customer Sentiment
Note the overall tone: Positive, Neutral, Frustrated, or Urgent
Add brief context if relevant (e.g., "Positive - excited about first cleaning")`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant for Raptor The Luxury Brand, a premium cleaning service company. Analyze phone calls and categorize them accurately based on the business context. Be professional, concise, and actionable in your summaries. Focus on extracting information that helps the team follow up effectively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: type === 'short' ? 60 : 600,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    return Response.json({ 
      summary,
      callId: id,
      type,
    });
  } catch (error) {
    console.error('Error generating call summary:', error);
    return Response.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
