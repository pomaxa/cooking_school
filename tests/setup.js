/**
 * Test Setup
 * Initializes test database and cleans up after tests
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use in-memory database for tests
const TEST_DB_PATH = ':memory:';

let testDb;

// Initialize test database before all tests
beforeAll(async () => {
  testDb = new sqlite3.Database(TEST_DB_PATH);

  // Create tables
  await new Promise((resolve, reject) => {
    testDb.serialize(() => {
      // Classes table
      testDb.run(`
        CREATE TABLE classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title_ru TEXT NOT NULL,
          title_lv TEXT NOT NULL,
          description_ru TEXT,
          description_lv TEXT,
          instructor_ru TEXT,
          instructor_lv TEXT,
          languages TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          duration TEXT NOT NULL,
          price REAL NOT NULL,
          capacity INTEGER NOT NULL,
          booked INTEGER DEFAULT 0,
          audience_type TEXT DEFAULT 'mixed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Bookings table
      testDb.run(`
        CREATE TABLE bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          class_id INTEGER NOT NULL,
          class_name_ru TEXT,
          class_name_lv TEXT,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          participants INTEGER NOT NULL,
          total_price REAL NOT NULL,
          payment_intent_id TEXT NOT NULL,
          status TEXT DEFAULT 'confirmed',
          allergies TEXT,
          payment_type TEXT DEFAULT 'full',
          paid_amount REAL,
          remaining_amount REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (class_id) REFERENCES classes (id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});

// Clean up database before each test
beforeEach(async () => {
  await new Promise((resolve, reject) => {
    testDb.serialize(() => {
      testDb.run('DELETE FROM bookings', (err) => {
        if (err) reject(err);
      });
      testDb.run('DELETE FROM classes', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});

// Close database after all tests
afterAll(async () => {
  await new Promise((resolve) => {
    testDb.close(() => resolve());
  });
});

// Export test database
module.exports = { testDb };
