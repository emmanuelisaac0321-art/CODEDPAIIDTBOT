
const Database = require("better-sqlite3");

const db = new Database("currency.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    diamonds INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    vip INTEGER DEFAULT 1,
    last_daily TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    type TEXT,
    Currency INTEGER,
    coins INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
