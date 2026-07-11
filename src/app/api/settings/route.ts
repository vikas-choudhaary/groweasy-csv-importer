import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

const SettingsSchema = z.object({
  geminiKey: z.string().min(1, "API Key is required"),
});

export async function GET() {
  try {
    if (process.env.MOCK === "true") {
      return NextResponse.json({ hasKey: true });
    }

    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get('geminiKey') as { value: string } | undefined;
    
    // We have a key if it's in the DB or ENV
    const hasKey = !!result?.value || !!process.env.GEMINI_API_KEY;
    
    return NextResponse.json({ hasKey });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { geminiKey } = SettingsSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES ('geminiKey', ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    
    stmt.run(geminiKey);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError' && 'errors' in error) {
      const zodError = error as { errors: { message: string }[] };
      return NextResponse.json({ error: zodError.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
