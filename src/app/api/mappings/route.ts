import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

const MappingPresetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mappingJson: z.string(),
});

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM mappings ORDER BY timestamp DESC');
    const mappings = stmt.all();
    return NextResponse.json(mappings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, mappingJson } = MappingPresetSchema.parse(body);

    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO mappings (id, name, mappingJson) 
      VALUES (?, ?, ?)
    `);
    
    stmt.run(id, name, mappingJson);

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
}
