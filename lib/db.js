const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "scheduler.db");

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureDatabaseFile() {
  if (!fs.existsSync(dbPath)) {
    // Create an empty file so startup behavior is explicit.
    fs.closeSync(fs.openSync(dbPath, "a"));
  }
}

ensureDataDirectory();
ensureDatabaseFile();

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initDatabase() {
  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  // Migrations: add columns if they don't exist yet
  const migrations = [
    "ALTER TABLE event ADD COLUMN days TEXT NOT NULL DEFAULT '[1,2,3,4,5]'",
    "ALTER TABLE event ADD COLUMN mode TEXT NOT NULL DEFAULT 'both'",
    "ALTER TABLE event ADD COLUMN location TEXT NOT NULL DEFAULT ''",
  ];
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists — ignore
    }
  }
}

initDatabase();

module.exports = { db, initDatabase };
