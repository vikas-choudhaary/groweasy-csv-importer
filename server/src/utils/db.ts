import Database from 'better-sqlite3';
import path from 'path';

// Connect to the same DB as Next.js, assumed to be in project root
const dbPath = path.join(process.cwd(), 'groweasy.db');
const db = new Database(dbPath);

// Use Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');

// Initialize schema for mappings if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS mappings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mappingJson TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    rowCount INTEGER NOT NULL,
    successRate REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    created_at TEXT,
    name TEXT,
    email TEXT UNIQUE,
    country_code TEXT,
    mobile_without_country_code TEXT,
    company TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    lead_owner TEXT,
    crm_status TEXT,
    crm_note TEXT,
    data_source TEXT,
    possession_time TEXT,
    description TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Mappings Migration
const mappingsCols = db.prepare('PRAGMA table_info(mappings)').all() as { name: string }[];
const mappingsColNames = mappingsCols.map(c => c.name);

const addMappingColumn = (name: string, definition: string) => {
  if (!mappingsColNames.includes(name)) {
    db.exec(`ALTER TABLE mappings ADD COLUMN ${name} ${definition}`);
  }
};

addMappingColumn('description', 'TEXT');
addMappingColumn('sourceHeaders', 'TEXT'); // JSON
addMappingColumn('normalizedSourceHeaders', 'TEXT'); // JSON
addMappingColumn('ignoredColumns', 'TEXT'); // JSON
addMappingColumn('confidenceThreshold', 'REAL');
addMappingColumn('usageCount', 'INTEGER DEFAULT 0');
addMappingColumn('updatedAt', 'DATETIME');
addMappingColumn('lastUsedAt', 'DATETIME');

// Imports Migration
const importsCols = db.prepare('PRAGMA table_info(imports)').all() as { name: string }[];
const importsColNames = importsCols.map(c => c.name);

const addImportColumn = (name: string, definition: string) => {
  if (!importsColNames.includes(name)) {
    db.exec(`ALTER TABLE imports ADD COLUMN ${name} ${definition}`);
  }
};

addImportColumn('fileSize', 'INTEGER');
addImportColumn('sourceHeaders', 'TEXT'); // JSON
addImportColumn('importedCount', 'INTEGER');
addImportColumn('skippedCount', 'INTEGER');
addImportColumn('status', 'TEXT');
addImportColumn('startedAt', 'DATETIME');
addImportColumn('completedAt', 'DATETIME');
addImportColumn('duration', 'INTEGER');
addImportColumn('mappingId', 'TEXT');
addImportColumn('mappingSnapshot', 'TEXT'); // JSON
addImportColumn('processingMode', 'TEXT');
addImportColumn('errorCategory', 'TEXT');
addImportColumn('errorMessage', 'TEXT');
addImportColumn('retryable', 'INTEGER'); // boolean 0/1
addImportColumn('importedRecords', 'TEXT'); // JSON
addImportColumn('skippedRecords', 'TEXT'); // JSON

export default db;
