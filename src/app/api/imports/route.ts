import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

const ImportSchema = z.object({
  filename: z.string(),
  rowCount: z.number(),
  successRate: z.number().min(0).max(1),
});

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM imports ORDER BY timestamp DESC');
    const imports = stmt.all();
    return NextResponse.json(imports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, rowCount, successRate } = ImportSchema.parse(body);

    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO imports (id, filename, rowCount, successRate) 
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, filename, rowCount, successRate);

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to log import" }, { status: 500 });
  }
}
