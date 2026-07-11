import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'groweasy.db');
const db = new Database(dbPath);

// Use Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    rowCount INTEGER NOT NULL,
    successRate REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mappings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mappingJson TEXT NOT NULL,
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

export default db;
