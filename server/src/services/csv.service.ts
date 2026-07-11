import { parse } from 'csv-parse';
import fs from 'fs';

export async function parseCsvFile(filePath: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const records: Record<string, unknown>[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }))
      .on('data', (data) => records.push(data))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(records));
  });
}
