const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Create database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'cooking_school.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema
function initializeDatabase() {
    db.serialize(() => {
        // Classes table
        db.run(`
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title_ru TEXT NOT NULL,
                title_lv TEXT NOT NULL,
                description_ru TEXT NOT NULL,
                description_lv TEXT NOT NULL,
                instructor_ru TEXT NOT NULL,
                instructor_lv TEXT NOT NULL,
                languages TEXT NOT NULL,
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
            if (err) {
                console.error('Error creating classes table:', err);
            } else {
                console.log('Classes table ready');
            }
        });

        // Bookings table
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                class_name_ru TEXT NOT NULL,
                class_name_lv TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                participants INTEGER NOT NULL,
                total_price REAL NOT NULL,
                status TEXT DEFAULT 'confirmed',
                payment_intent_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating bookings table:', err);
            } else {
                console.log('Bookings table ready');
            }
        });

        // Migration: Add audience_type column if it doesn't exist
        db.all("PRAGMA table_info(classes)", [], (err, columns) => {
            if (err) {
                console.error('Error checking table structure:', err);
            } else {
                const hasAudienceType = columns.some(col => col.name === 'audience_type');
                if (!hasAudienceType) {
                    db.run('ALTER TABLE classes ADD COLUMN audience_type TEXT DEFAULT "mixed"', (err) => {
                        if (err) {
                            console.error('Error adding audience_type column:', err);
                        } else {
                            console.log('Successfully added audience_type column to classes table');
                        }
                    });
                }
            }
        });
    });
}

// Helper functions for database operations

// Classes operations
const classesDb = {
    // Get all classes
    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM classes ORDER BY date, time', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Convert database format to API format
                    const classes = rows.map(row => ({
                        id: row.id,
                        title: {
                            ru: row.title_ru,
                            lv: row.title_lv
                        },
                        description: {
                            ru: row.description_ru,
                            lv: row.description_lv
                        },
                        instructor: {
                            ru: row.instructor_ru,
                            lv: row.instructor_lv
                        },
                        languages: JSON.parse(row.languages),
                        date: row.date,
                        time: row.time,
                        duration: row.duration,
                        price: row.price,
                        capacity: row.capacity,
                        booked: row.booked,
                        audienceType: row.audience_type || 'mixed'
                    }));
                    resolve(classes);
                }
            });
        });
    },

    // Get class by ID
    getById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM classes WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    const classItem = {
                        id: row.id,
                        title: {
                            ru: row.title_ru,
                            lv: row.title_lv
                        },
                        description: {
                            ru: row.description_ru,
                            lv: row.description_lv
                        },
                        instructor: {
                            ru: row.instructor_ru,
                            lv: row.instructor_lv
                        },
                        languages: JSON.parse(row.languages),
                        date: row.date,
                        time: row.time,
                        duration: row.duration,
                        price: row.price,
                        capacity: row.capacity,
                        booked: row.booked,
                        audienceType: row.audience_type || 'mixed'
                    };
                    resolve(classItem);
                }
            });
        });
    },

    // Create new class
    create: (classData) => {
        return new Promise((resolve, reject) => {
            const { title, description, instructor, languages, date, time, duration, price, capacity, audienceType } = classData;

            // Handle both multilingual and single language formats
            const titleRu = typeof title === 'object' ? title.ru : title;
            const titleLv = typeof title === 'object' ? title.lv : title;
            const descRu = typeof description === 'object' ? description.ru : description;
            const descLv = typeof description === 'object' ? description.lv : description;
            const instrRu = typeof instructor === 'object' ? instructor.ru : instructor;
            const instrLv = typeof instructor === 'object' ? instructor.lv : instructor;

            const sql = `
                INSERT INTO classes (
                    title_ru, title_lv, description_ru, description_lv,
                    instructor_ru, instructor_lv, languages, date, time,
                    duration, price, capacity, booked, audience_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            `;

            db.run(sql, [
                titleRu, titleLv, descRu, descLv, instrRu, instrLv,
                JSON.stringify(languages || ['ru', 'lv']),
                date, time, duration, price, capacity, audienceType || 'mixed'
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    },

    // Update class
    update: (id, classData) => {
        return new Promise((resolve, reject) => {
            const { title, description, instructor, languages, date, time, duration, price, capacity, audienceType } = classData;

            // Handle both multilingual and single language formats
            const titleRu = typeof title === 'object' ? title.ru : title;
            const titleLv = typeof title === 'object' ? title.lv : title;
            const descRu = typeof description === 'object' ? description.ru : description;
            const descLv = typeof description === 'object' ? description.lv : description;
            const instrRu = typeof instructor === 'object' ? instructor.ru : instructor;
            const instrLv = typeof instructor === 'object' ? instructor.lv : instructor;

            const sql = `
                UPDATE classes SET
                    title_ru = ?, title_lv = ?, description_ru = ?, description_lv = ?,
                    instructor_ru = ?, instructor_lv = ?, languages = ?, date = ?,
                    time = ?, duration = ?, price = ?, capacity = ?, audience_type = ?
                WHERE id = ?
            `;

            db.run(sql, [
                titleRu, titleLv, descRu, descLv, instrRu, instrLv,
                JSON.stringify(languages || ['ru', 'lv']),
                date, time, duration, price, capacity, audienceType || 'mixed', id
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Delete class
    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM classes WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Increment booked count
    incrementBooked: (id, count) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE classes SET booked = booked + ? WHERE id = ?', [count, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Decrement booked count
    decrementBooked: (id, count) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE classes SET booked = booked - ? WHERE id = ?', [count, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }
};

// Bookings operations
const bookingsDb = {
    // Get all bookings
    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const bookings = rows.map(row => ({
                        id: row.id,
                        classId: row.class_id,
                        className: {
                            ru: row.class_name_ru,
                            lv: row.class_name_lv
                        },
                        customerName: row.customer_name,
                        email: row.email,
                        phone: row.phone,
                        participants: row.participants,
                        totalPrice: row.total_price,
                        paymentType: row.payment_type || 'full',
                        paidAmount: row.paid_amount || row.total_price,
                        remainingAmount: row.remaining_amount || 0,
                        status: row.status,
                        paymentIntentId: row.payment_intent_id,
                        createdAt: row.created_at
                    }));
                    resolve(bookings);
                }
            });
        });
    },

    // Get bookings by email
    getByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM bookings WHERE email = ? ORDER BY created_at DESC', [email], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const bookings = rows.map(row => ({
                        id: row.id,
                        classId: row.class_id,
                        className: {
                            ru: row.class_name_ru,
                            lv: row.class_name_lv
                        },
                        customerName: row.customer_name,
                        email: row.email,
                        phone: row.phone,
                        participants: row.participants,
                        totalPrice: row.total_price,
                        paymentType: row.payment_type || 'full',
                        paidAmount: row.paid_amount || row.total_price,
                        remainingAmount: row.remaining_amount || 0,
                        status: row.status,
                        paymentIntentId: row.payment_intent_id,
                        createdAt: row.created_at
                    }));
                    resolve(bookings);
                }
            });
        });
    },

    // Get bookings by class ID
    getByClassId: (classId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM bookings WHERE class_id = ? ORDER BY created_at DESC', [classId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const bookings = rows.map(row => ({
                        id: row.id,
                        classId: row.class_id,
                        className: {
                            ru: row.class_name_ru,
                            lv: row.class_name_lv
                        },
                        customerName: row.customer_name,
                        email: row.email,
                        phone: row.phone,
                        participants: row.participants,
                        totalPrice: row.total_price,
                        paymentType: row.payment_type || 'full',
                        paidAmount: row.paid_amount || row.total_price,
                        remainingAmount: row.remaining_amount || 0,
                        status: row.status,
                        paymentIntentId: row.payment_intent_id,
                        createdAt: row.created_at
                    }));
                    resolve(bookings);
                }
            });
        });
    },

    // Create new booking
    create: (bookingData) => {
        return new Promise((resolve, reject) => {
            const {
                classId, className, customerName, email, phone, participants,
                totalPrice, paymentIntentId, paymentType, paidAmount, remainingAmount
            } = bookingData;

            const classNameRu = typeof className === 'object' ? className.ru : className;
            const classNameLv = typeof className === 'object' ? className.lv : className;

            const sql = `
                INSERT INTO bookings (
                    class_id, class_name_ru, class_name_lv, customer_name,
                    email, phone, participants, total_price, payment_type,
                    paid_amount, remaining_amount, status, payment_intent_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
            `;

            db.run(sql, [
                classId, classNameRu, classNameLv, customerName,
                email, phone, participants, totalPrice,
                paymentType || 'full',
                paidAmount || totalPrice,
                remainingAmount || 0,
                paymentIntentId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    },

    // Update booking status
    updateStatus: (id, status) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Get booking by ID
    getById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    const booking = {
                        id: row.id,
                        classId: row.class_id,
                        className: {
                            ru: row.class_name_ru,
                            lv: row.class_name_lv
                        },
                        customerName: row.customer_name,
                        email: row.email,
                        phone: row.phone,
                        participants: row.participants,
                        totalPrice: row.total_price,
                        paymentType: row.payment_type || 'full',
                        paidAmount: row.paid_amount || row.total_price,
                        remainingAmount: row.remaining_amount || 0,
                        status: row.status,
                        paymentIntentId: row.payment_intent_id,
                        createdAt: row.created_at
                    };
                    resolve(booking);
                }
            });
        });
    }
};

module.exports = {
    db,
    classesDb,
    bookingsDb
};
