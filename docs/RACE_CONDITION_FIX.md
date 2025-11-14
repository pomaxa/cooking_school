# Race Condition Fix Strategy - Overbooking Prevention

## Problem Statement

**Severity:** CRITICAL
**Impact:** Money loss, customer dissatisfaction, double-booking

### Current Issue
The booking system has a race condition that allows overbooking when multiple users try to book the last available spots simultaneously.

**Test Evidence:**
```javascript
// Test: tests/unit/database.test.js
// Result: 3 concurrent bookings for 2 participants each = 6 bookings
// Expected: booked <= capacity (10)
// Actual: booked = 14 (OVERBOOKING BY 4!)
```

### Why This Happens

1. **Non-Atomic Operations:**
   ```javascript
   // Current flow (NOT ATOMIC):
   const cls = await classesDb.getById(classId);
   const availableSpots = cls.capacity - cls.booked; // Check

   if (availableSpots >= participants) {
       await classesDb.incrementBooked(classId, participants); // Update
   }
   ```

2. **Race Condition Timeline:**
   ```
   Time | Request A          | Request B          | Database
   -----|--------------------|--------------------|----------
   T1   | Read: booked=8     |                    | booked=8
   T2   |                    | Read: booked=8     | booked=8
   T3   | Check: 8+2 <= 10 ✓ |                    | booked=8
   T4   |                    | Check: 8+2 <= 10 ✓ | booked=8
   T5   | Increment +2       |                    | booked=10
   T6   |                    | Increment +2       | booked=12 ❌
   ```

---

## Solution Options

### Option 1: Database Transaction with Row Locking (RECOMMENDED)

**Pros:**
- Most reliable solution
- Prevents all race conditions
- Database-level guarantee

**Cons:**
- Requires transaction support (SQLite supports it)
- Slightly more complex code

**Implementation:**

```javascript
// In database.js
async function bookClassAtomic(classId, participants) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Lock row for update
      db.get(
        'SELECT * FROM classes WHERE id = ? FOR UPDATE',
        [classId],
        (err, cls) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const availableSpots = cls.capacity - cls.booked;

          if (availableSpots < participants) {
            db.run('ROLLBACK');
            return reject(new Error('Not enough spots available'));
          }

          // Update booked count
          db.run(
            'UPDATE classes SET booked = booked + ? WHERE id = ?',
            [participants, classId],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              db.run('COMMIT');
              resolve();
            }
          );
        }
      );
    });
  });
}
```

**Usage in server.js:**
```javascript
// Replace separate check and increment
await bookClassAtomic(classId, participants);
```

---

### Option 2: Optimistic Locking with Version Field

**Pros:**
- No blocking
- Good for high concurrency

**Cons:**
- Requires schema change (add version field)
- Need retry logic

**Implementation:**

1. **Add version column:**
   ```sql
   ALTER TABLE classes ADD COLUMN version INTEGER DEFAULT 0;
   ```

2. **Update with version check:**
   ```javascript
   async function incrementBookedOptimistic(classId, participants, expectedVersion) {
     const result = await db.run(
       `UPDATE classes
        SET booked = booked + ?, version = version + 1
        WHERE id = ?
        AND capacity - booked >= ?
        AND version = ?`,
       [participants, classId, participants, expectedVersion]
     );

     if (result.changes === 0) {
       throw new Error('Booking conflict - please retry');
     }
   }
   ```

3. **Retry logic in API:**
   ```javascript
   let retries = 3;
   while (retries > 0) {
     try {
       const cls = await classesDb.getById(classId);
       await incrementBookedOptimistic(classId, participants, cls.version);
       break; // Success
     } catch (error) {
       retries--;
       if (retries === 0) throw error;
       await sleep(100); // Wait before retry
     }
   }
   ```

---

### Option 3: Check-Update in Single Query

**Pros:**
- Simple
- No schema changes
- Works with current code

**Cons:**
- Less robust than transactions
- Depends on database isolation level

**Implementation:**

```javascript
async function incrementBookedSafe(classId, participants) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE classes
       SET booked = booked + ?
       WHERE id = ?
       AND (capacity - booked) >= ?`,
      [participants, classId, participants],
      function(err) {
        if (err) return reject(err);

        if (this.changes === 0) {
          return reject(new Error('Not enough available spots'));
        }

        resolve();
      }
    );
  });
}
```

**Usage:**
```javascript
try {
  await incrementBookedSafe(classId, participants);
} catch (error) {
  return res.status(400).json({
    error: 'Not enough spots available or class is full'
  });
}
```

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (Option 3)
**Timeline:** 1 hour
**Risk:** Low

1. Implement `incrementBookedSafe()` in `database.js`
2. Update `POST /api/confirm-booking` to use new function
3. Remove separate capacity check
4. Update tests to verify fix

### Phase 2: Robust Solution (Option 1)
**Timeline:** 4 hours
**Risk:** Medium

1. Implement transaction-based `bookClassAtomic()`
2. Add comprehensive integration tests
3. Performance testing with concurrent requests
4. Deploy with monitoring

---

## Testing Strategy

### Unit Tests
```javascript
test('concurrent bookings with single spot remaining', async () => {
  const classData = createTestClass({ capacity: 10, booked: 9 });
  const classId = await classesDb.create(classData);

  const promises = [
    bookClassAtomic(classId, 1),
    bookClassAtomic(classId, 1),
    bookClassAtomic(classId, 1)
  ];

  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  expect(successful.length).toBe(1); // Only 1 should succeed
  expect(failed.length).toBe(2);     // 2 should fail

  const updated = await classesDb.getById(classId);
  expect(updated.booked).toBe(10);   // Should not exceed capacity
});
```

### Load Testing
```bash
# Using Apache Bench
ab -n 100 -c 10 -p booking.json -T application/json \
  http://localhost:3001/api/confirm-booking
```

---

## Migration Guide

### Step 1: Backup Database
```bash
cp cooking_school.db cooking_school.db.backup
```

### Step 2: Deploy New Code
- Update `database.js` with transaction code
- Update `server.js` to use atomic booking
- Run tests: `npm test`

### Step 3: Monitor
```javascript
// Add logging
console.log(`[BOOKING] Class ${classId}: ${booked}/${capacity} spots`);
```

### Step 4: Rollback Plan
If issues occur:
```bash
git revert <commit-hash>
cp cooking_school.db.backup cooking_school.db
pm2 restart cooking-school
```

---

## Impact Assessment

### Before Fix:
- **Risk:** High - unlimited overbooking possible
- **Impact:**
  - Customer dissatisfaction
  - Refund costs
  - Reputation damage
  - Class capacity violations

### After Fix:
- **Risk:** Low - race conditions prevented
- **Benefits:**
  - Accurate capacity management
  - No overbooking
  - Better customer experience
  - Data integrity maintained

---

## Performance Considerations

### Transaction Overhead:
- **Read queries:** No impact
- **Booking operations:** +2-5ms latency
- **Concurrency:** Better handling under load

### Benchmarks (Expected):
```
Without transactions:
- Bookings/sec: 100
- Race conditions: ~5% at high concurrency

With transactions:
- Bookings/sec: 90-95 (-5-10%)
- Race conditions: 0%
```

**Conclusion:** Small performance cost is worth the data integrity guarantee.

---

## References

- SQLite Transactions: https://www.sqlite.org/lang_transaction.html
- Test file: `tests/unit/database.test.js:161-185`
- Bug ticket: `RACE_CONDITION_OVERBOOKING`

---

**Status:** DOCUMENTED - Ready for implementation
**Priority:** HIGH
**Estimated Fix Time:** 2-4 hours
**Breaking Changes:** None
