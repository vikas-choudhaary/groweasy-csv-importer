import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import db from '@/lib/db';

const GrowEasyFieldSchema = z.object({
  csvHeader: z.string(),
  mappedTo: z.enum([
    "created_at",
    "name",
    "email",
    "country_code",
    "mobile_without_country_code",
    "company",
    "city",
    "state",
    "country",
    "lead_owner",
    "crm_status",
    "crm_note",
    "data_source",
    "possession_time",
    "description",
    "ignore"
  ]),
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type GrowEasyMapping = z.infer<typeof GrowEasyFieldSchema>;

// In-memory rate limiter (for assignment scope)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    // Basic IP extraction for rate limiting (fallback to generic if not found)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. Please wait a minute before trying again." 
      }, { status: 429 });
    }

    const { headers, sampleData } = await req.json();
    
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json({ error: "Invalid or missing headers" }, { status: 400 });
    }

    // Fetch API Key from DB, fallback to ENV
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const dbKeyResult = stmt.get('geminiKey') as { value: string } | undefined;
    const apiKey = dbKeyResult?.value || process.env.GEMINI_API_KEY;

    // For stress testing locally
    if (process.env.MOCK === "true") {
      return NextResponse.json({ 
        mappings: headers.map(h => ({
          csvHeader: h,
          mappedTo: "name",
          confidenceScore: 1,
          reasoning: "Mock mapping for testing"
        }))
      });
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: "Google Gemini API Key is missing. Please add it in the Settings page." 
      }, { status: 401 }); // 401 Unauthorized so the frontend knows it's a key issue
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        mappings: z.array(GrowEasyFieldSchema).describe("An array mapping every provided CSV header to a standard CRM field or 'ignore'.")
      }),
      prompt: `
        Analyze the following CSV headers and sample data rows.
        Map each CSV header to the most appropriate official GrowEasy CRM field.
        
        Official GrowEasy CRM Fields:
        - created_at: When the lead was created
        - name: The person's full name. If the CSV splits First Name and Last Name into two columns, map BOTH of them to 'name'.
        - email: Email address
        - country_code: Phone country code
        - mobile_without_country_code: Mobile/phone number without the country code
        - company: Company or organization name
        - city: City
        - state: State or province
        - country: Country
        - lead_owner: The team member who owns the lead
        - crm_status: Current CRM status
        - crm_note: General notes. Map "Job Title" here if "description" is already taken, or vice versa.
        - data_source: Lead source, campaign name, or where the data came from
        - possession_time: When the lead came into possession
        - description: Additional context or description. Map "Job Title", "Role", etc., to this if applicable.
        
        RULES:
        1. Never use generic fields like 'firstName', 'lastName', or 'jobTitle'. Only use the exact official fields provided above.
        2. If a CSV header does not match any CRM field meaningfully, map it to 'ignore'.
        3. Provide a confidence score between 0.0 and 1.0.
        4. Provide brief reasoning for your choice.

        CSV Headers: ${JSON.stringify(headers)}
        Sample Data: ${JSON.stringify(sampleData)}
      `
    });

    return NextResponse.json({ mappings: object.mappings });
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    console.error("====== AI MAPPING ERROR TRACE ======");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    if (err.cause) console.error("Error Cause:", err.cause);
    if (err.statusCode) console.error("Status Code:", err.statusCode);
    if (err.responseBody) console.error("Response Body:", err.responseBody);
    console.error("Full Stack Trace:", err.stack);
    console.error("=====================================");
    
    return NextResponse.json({ 
      error: err.message || "Failed to process CSV mapping.",
      details: err.responseBody || err.cause || "No additional details available"
    }, { status: 500 });
  }
}
