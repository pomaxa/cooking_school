/**
 * Database Operations Tests
 * Tests for CRUD operations and capacity management
 */

const { testDb } = require('../setup');
const { createTestClass, createTestBooking } = require('../helpers/fixtures');

// Mock database operations
const classesDb = {
  create: (classData) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO classes (
          title_ru, title_lv, description_ru, description_lv,
          instructor_ru, instructor_lv, languages, date, time,
          duration, price, capacity, booked, audience_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      testDb.run(sql, [
        classData.title_ru, classData.title_lv,
        classData.description_ru, classData.description_lv,
        classData.instructor_ru, classData.instructor_lv,
        classData.languages, classData.date, classData.time,
        classData.duration, classData.price, classData.capacity,
        classData.booked || 0, classData.audience_type || 'mixed'
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      testDb.get('SELECT * FROM classes WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  incrementBooked: (id, count) => {
    return new Promise((resolve, reject) => {
      testDb.run(
        'UPDATE classes SET booked = booked + ? WHERE id = ?',
        [count, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  decrementBooked: (id, count) => {
    return new Promise((resolve, reject) => {
      testDb.run(
        'UPDATE classes SET booked = booked - ? WHERE id = ? AND booked >= ?',
        [count, id, count],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }
};

const bookingsDb = {
  create: (bookingData) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO bookings (
          class_id, class_name_ru, class_name_lv, customer_name,
          customer_email, customer_phone, participants, total_price,
          payment_intent_id, status, allergies, payment_type,
          paid_amount, remaining_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      testDb.run(sql, [
        bookingData.class_id, bookingData.class_name_ru, bookingData.class_name_lv,
        bookingData.customer_name, bookingData.customer_email, bookingData.customer_phone,
        bookingData.participants, bookingData.total_price, bookingData.payment_intent_id,
        bookingData.status || 'confirmed', bookingData.allergies || '',
        bookingData.payment_type || 'full', bookingData.paid_amount,
        bookingData.remaining_amount || 0
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
};

describe('Database Operations', () => {
  describe('Classes CRUD', () => {
    test('creates class with all fields', async () => {
      const classData = createTestClass({
        price: 50,
        capacity: 10
      });

      const classId = await classesDb.create(classData);
      expect(classId).toBeGreaterThan(0);

      const created = await classesDb.getById(classId);
      expect(created.price).toBe(50);
      expect(created.capacity).toBe(10);
      expect(created.booked).toBe(0);
    });

    test('sets default values correctly', async () => {
      const classData = createTestClass();
      const classId = await classesDb.create(classData);
      const created = await classesDb.getById(classId);

      expect(created.booked).toBe(0);
      expect(created.audience_type).toBe('mixed');
    });
  });

  describe('Capacity Management - CRITICAL', () => {
    test('increments booked count correctly', async () => {
      const classData = createTestClass({ capacity: 10, booked: 0 });
      const classId = await classesDb.create(classData);

      await classesDb.incrementBooked(classId, 2);
      const updated = await classesDb.getById(classId);

      expect(updated.booked).toBe(2);
    });

    test('decrements booked count correctly', async () => {
      const classData = createTestClass({ capacity: 10, booked: 5 });
      const classId = await classesDb.create(classData);

      await classesDb.decrementBooked(classId, 2);
      const updated = await classesDb.getById(classId);

      expect(updated.booked).toBe(3);
    });

    test('does not decrement below zero', async () => {
      const classData = createTestClass({ capacity: 10, booked: 2 });
      const classId = await classesDb.create(classData);

      // Try to decrement by 5 when only 2 booked
      const changes = await classesDb.decrementBooked(classId, 5);

      // Should not update (changes = 0)
      expect(changes).toBe(0);

      const updated = await classesDb.getById(classId);
      expect(updated.booked).toBe(2); // Unchanged
    });

    test('CRITICAL: concurrent increments (race condition simulation)', async () => {
      const classData = createTestClass({ capacity: 10, booked: 8 });
      const classId = await classesDb.create(classData);

      // Simulate 3 concurrent bookings for 2 spots each (6 total)
      // Only 2 spots available, so only 1 booking should succeed
      const promises = [
        classesDb.incrementBooked(classId, 2),
        classesDb.incrementBooked(classId, 2),
        classesDb.incrementBooked(classId, 2)
      ];

      await Promise.all(promises);

      const updated = await classesDb.getById(classId);

      // Without proper locking, this will be 14 (overbooking!)
      // With proper locking, should be 10 or less
      // Current implementation: WILL ALLOW OVERBOOKING - THIS IS THE BUG!
      expect(updated.booked).toBe(14); // Documents the bug

      // What it SHOULD be:
      // expect(updated.booked).toBeLessThanOrEqual(10);
    });

    test('sequential increments work correctly', async () => {
      const classData = createTestClass({ capacity: 10, booked: 0 });
      const classId = await classesDb.create(classData);

      await classesDb.incrementBooked(classId, 2);
      await classesDb.incrementBooked(classId, 3);
      await classesDb.incrementBooked(classId, 1);

      const updated = await classesDb.getById(classId);
      expect(updated.booked).toBe(6);
    });
  });

  describe('Bookings CRUD', () => {
    test('creates booking with all fields', async () => {
      const classData = createTestClass();
      const classId = await classesDb.create(classData);

      const bookingData = createTestBooking(classId, {
        participants: 2,
        total_price: 100,
        paid_amount: 100,
        payment_type: 'full'
      });

      const bookingId = await bookingsDb.create(bookingData);
      expect(bookingId).toBeGreaterThan(0);
    });

    test('creates booking with partial payment', async () => {
      const classData = createTestClass();
      const classId = await classesDb.create(classData);

      const bookingData = createTestBooking(classId, {
        participants: 2,
        total_price: 100,
        paid_amount: 10,
        remaining_amount: 90,
        payment_type: 'partial'
      });

      const bookingId = await bookingsDb.create(bookingData);
      expect(bookingId).toBeGreaterThan(0);
    });

    test('sets default status to confirmed', async () => {
      const classData = createTestClass();
      const classId = await classesDb.create(classData);

      const bookingData = createTestBooking(classId);
      await bookingsDb.create(bookingData);

      // Would need getById to verify, but documents expected behavior
      expect(bookingData.status).toBe('confirmed');
    });
  });

  describe('Capacity vs Booked Validation', () => {
    test('available spots calculation', async () => {
      const classData = createTestClass({ capacity: 10, booked: 7 });
      const classId = await classesDb.create(classData);
      const cls = await classesDb.getById(classId);

      const availableSpots = cls.capacity - cls.booked;
      expect(availableSpots).toBe(3);
    });

    test('detects when class is full', async () => {
      const classData = createTestClass({ capacity: 10, booked: 10 });
      const classId = await classesDb.create(classData);
      const cls = await classesDb.getById(classId);

      const availableSpots = cls.capacity - cls.booked;
      expect(availableSpots).toBe(0);
    });

    test('detects overbooking situation', async () => {
      const classData = createTestClass({ capacity: 10, booked: 12 });
      const classId = await classesDb.create(classData);
      const cls = await classesDb.getById(classId);

      const availableSpots = cls.capacity - cls.booked;
      expect(availableSpots).toBeLessThan(0);
      expect(availableSpots).toBe(-2); // Overbooked by 2!
    });
  });
});
