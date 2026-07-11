import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const LeadRowSchema = z.object({
  created_at: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  country_code: z.string().optional(),
  mobile_without_country_code: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  lead_owner: z.string().optional(),
  crm_status: z.string().optional(),
  crm_note: z.string().optional(),
  data_source: z.string().optional(),
  possession_time: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

const BatchRequestSchema = z.object({
  importId: z.string(),
  rows: z.array(LeadRowSchema),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { importId, rows } = BatchRequestSchema.parse(body);

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, failed: 0, errors: [] });
    }

    let imported = 0;
    let failed = 0;
    const errors: Array<{ rowIndex: number; error: string }> = [];

    // Use a transaction for high-performance batch insertion/upsertion
    const insertLead = db.prepare(`
      INSERT INTO leads (
        id, import_id, created_at, name, email, country_code, mobile_without_country_code, 
        company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(email) DO UPDATE SET
        import_id = excluded.import_id,
        created_at = COALESCE(excluded.created_at, leads.created_at),
        name = COALESCE(excluded.name, leads.name),
        country_code = COALESCE(excluded.country_code, leads.country_code),
        mobile_without_country_code = COALESCE(excluded.mobile_without_country_code, leads.mobile_without_country_code),
        company = COALESCE(excluded.company, leads.company),
        city = COALESCE(excluded.city, leads.city),
        state = COALESCE(excluded.state, leads.state),
        country = COALESCE(excluded.country, leads.country),
        lead_owner = COALESCE(excluded.lead_owner, leads.lead_owner),
        crm_status = COALESCE(excluded.crm_status, leads.crm_status),
        crm_note = COALESCE(excluded.crm_note, leads.crm_note),
        data_source = COALESCE(excluded.data_source, leads.data_source),
        possession_time = COALESCE(excluded.possession_time, leads.possession_time),
        description = COALESCE(excluded.description, leads.description),
        imported_at = CURRENT_TIMESTAMP
      WHERE excluded.email IS NOT NULL;
    `);

    const insertBatch = db.transaction((batchRows: z.infer<typeof LeadRowSchema>[]) => {
      let index = 0;
      for (const row of batchRows) {
        try {
          // A real CRM might require name or email. Let's make at least one required for "success".
          if (!row.name && !row.email && !row.mobile_without_country_code) {
            failed++;
            errors.push({ rowIndex: index, error: "Row missing required identifying fields (name, email, or mobile)." });
            index++;
            continue;
          }

          const id = crypto.randomUUID();
          insertLead.run(
            id,
            importId,
            row.created_at || null,
            row.name || null,
            row.email || null,
            row.country_code || null,
            row.mobile_without_country_code || null,
            row.company || null,
            row.city || null,
            row.state || null,
            row.country || null,
            row.lead_owner || null,
            row.crm_status || null,
            row.crm_note || null,
            row.data_source || null,
            row.possession_time || null,
            row.description || null
          );
          imported++;
        } catch (e: unknown) {
          failed++;
          const errorMessage = e instanceof Error ? e.message : "Database insert error";
          errors.push({ rowIndex: index, error: errorMessage });
        }
        index++;
      }
    });

    // Execute the transaction
    insertBatch(rows);

    return NextResponse.json({ imported, failed, errors });
  } catch (error: unknown) {
    console.error("Batch insert failed", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to process batch", details: errorMessage }, { status: 500 });
  }
}
