// Migration script to add payment_type fields to bookings table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cooking_school.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database');
        migrate();
    }
});

async function migrate() {
    console.log('Starting migration to add payment type fields...');

    try {
        // Add payment_type column
        await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE bookings ADD COLUMN payment_type TEXT DEFAULT 'full'`, (err) => {
                if (err) {
                    if (err.message.includes('duplicate column name')) {
                        console.log('Column payment_type already exists');
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    console.log('Added column: payment_type');
                    resolve();
                }
            });
        });

        // Add paid_amount column
        await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE bookings ADD COLUMN paid_amount REAL`, (err) => {
                if (err) {
                    if (err.message.includes('duplicate column name')) {
                        console.log('Column paid_amount already exists');
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    console.log('Added column: paid_amount');
                    resolve();
                }
            });
        });

        // Add remaining_amount column
        await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE bookings ADD COLUMN remaining_amount REAL DEFAULT 0`, (err) => {
                if (err) {
                    if (err.message.includes('duplicate column name')) {
                        console.log('Column remaining_amount already exists');
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    console.log('Added column: remaining_amount');
                    resolve();
                }
            });
        });

        // Update existing records to set paid_amount = total_price and payment_type = 'full'
        await new Promise((resolve, reject) => {
            db.run(`UPDATE bookings SET paid_amount = total_price, payment_type = 'full', remaining_amount = 0 WHERE paid_amount IS NULL`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Updated existing records with default values');
                    resolve();
                }
            });
        });

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
