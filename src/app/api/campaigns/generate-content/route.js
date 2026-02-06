import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SHORTCODES = [
  { code: "{{first_name}}", description: "Customer's first name" },
  { code: "{{last_name}}", description: "Customer's last name" },
  { code: "{{city}}", description: "Customer's city" },
  { code: "{{last_booking_date}}", description: "Date of their last booking" },
  { code: "{{company_name}}", description: "Always 'Raptor The Luxury Brand'" },
];

export async function POST(request) {
  try {
    const { brief } = await request.json();

    if (!brief || brief.trim().length < 10) {
      return Response.json(
        { error: "Please provide a more detailed campaign brief" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a marketing expert for "Raptor The Luxury Brand", a premium luxury cleaning service company. 
Your job is to create professional, warm, and engaging marketing content.

Available shortcodes for personalization (use these in your content):
${SHORTCODES.map((s) => `- ${s.code}: ${s.description}`).join("\n")}

Guidelines:
- Always use {{first_name}} at the start of emails and calls to personalize
- Keep the tone professional yet friendly
- Emphasize the luxury and quality of our services
- Be concise - emails should be 3-4 short paragraphs max
- Call scripts should be conversational, not robotic
- Include a clear call-to-action

Respond with valid JSON containing:
{
  "emailSubject": "...",
  "emailBody": "...",
  "callScript": "..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create email and call script content for this campaign:\n\n${brief}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = JSON.parse(response.choices[0]?.message?.content || "{}");

    return Response.json({
      emailSubject: content.emailSubject || "",
      emailBody: content.emailBody || "",
      callScript: content.callScript || "",
    });
  } catch (error) {
    console.error("Error generating campaign content:", error);
    return Response.json(
      { error: "Failed to generate content. Please try again." },
      { status: 500 }
    );
  }
}
