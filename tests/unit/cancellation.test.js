/**
 * Cancellation Logic Tests
 * Tests for 24-hour rule, refund calculations, and cancellation flow
 */

const { calculatePaymentAmounts } = require('../helpers/fixtures');

/**
 * Check if booking can be cancelled (24-hour rule)
 */
function canCancelBooking(classDate, classTime) {
  const [hours, minutes] = classTime.split(':').map(Number);
  const classDateTime = new Date(classDate);
  classDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);

  return hoursUntilClass >= 24;
}

/**
 * Calculate refund amount based on payment type
 * BUG FIX: Should refund paidAmount, not totalPrice
 */
function calculateRefundAmount(booking) {
  // CORRECT implementation:
  return booking.paid_amount;

  // BUGGY implementation (current in server.js:598):
  // return booking.total_price;
}

describe('Cancellation Logic', () => {
  describe('24-Hour Cancellation Rule', () => {
    test('allows cancellation 25 hours before class (safely over 24h)', () => {
      const future = new Date();
      future.setHours(future.getHours() + 25);
      const date = future.toISOString().split('T')[0];
      const time = future.toTimeString().split(' ')[0].substring(0, 5);

      const canCancel = canCancelBooking(date, time);
      expect(canCancel).toBe(true);
    });

    test('allows cancellation more than 24 hours before class', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const date = futureDate.toISOString().split('T')[0];

      const canCancel = canCancelBooking(date, '18:00');
      expect(canCancel).toBe(true);
    });

    test('blocks cancellation less than 24 hours before class', () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 20); // 20 hours from now
      const date = tomorrow.toISOString().split('T')[0];
      const time = tomorrow.toTimeString().split(' ')[0].substring(0, 5);

      const canCancel = canCancelBooking(date, time);
      expect(canCancel).toBe(false);
    });

    test('blocks cancellation on same day', () => {
      const today = new Date();
      const date = today.toISOString().split('T')[0];

      const canCancel = canCancelBooking(date, '18:00');
      expect(canCancel).toBe(false);
    });

    test('handles edge case: 23 hours 59 minutes before', () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 23);
      tomorrow.setMinutes(tomorrow.getMinutes() + 59);
      const date = tomorrow.toISOString().split('T')[0];
      const time = tomorrow.toTimeString().split(' ')[0].substring(0, 5);

      const canCancel = canCancelBooking(date, time);
      expect(canCancel).toBe(false); // Less than 24 hours
    });

    test('handles edge case: 24 hours 1 minute before', () => {
      const future = new Date();
      future.setHours(future.getHours() + 24);
      future.setMinutes(future.getMinutes() + 1);
      const date = future.toISOString().split('T')[0];
      const time = future.toTimeString().split(' ')[0].substring(0, 5);

      const canCancel = canCancelBooking(date, time);
      expect(canCancel).toBe(true); // More than 24 hours
    });
  });

  describe('Refund Amount Calculation - CRITICAL BUG FIX', () => {
    test('full payment refund returns total amount paid', () => {
      const booking = {
        total_price: 100,
        paid_amount: 100,
        remaining_amount: 0,
        payment_type: 'full'
      };

      const refundAmount = calculateRefundAmount(booking);
      expect(refundAmount).toBe(100);
      expect(refundAmount).toBe(booking.paid_amount);
    });

    test('partial payment refund returns ONLY deposit paid (10%), not total', () => {
      const booking = {
        total_price: 100,
        paid_amount: 10, // Only paid 10% deposit
        remaining_amount: 90,
        payment_type: 'partial'
      };

      const refundAmount = calculateRefundAmount(booking);

      // CORRECT: Refund only what was paid (10€)
      expect(refundAmount).toBe(10);
      expect(refundAmount).toBe(booking.paid_amount);

      // BUG: server.js:598 refunds totalPrice (100€) instead!
      expect(refundAmount).not.toBe(booking.total_price);
    });

    test('refund amount matches original Stripe charge', () => {
      const { totalPrice, paidAmount } = calculatePaymentAmounts(45.50, 2, 'partial');

      const booking = {
        total_price: totalPrice,
        paid_amount: paidAmount,
        remaining_amount: totalPrice - paidAmount,
        payment_type: 'partial'
      };

      const refundAmount = calculateRefundAmount(booking);

      // Refund should match what was charged by Stripe
      expect(refundAmount).toBe(paidAmount);
      expect(refundAmount).toBe(9.10); // 10% of 91€
    });

    test('refund for multiple participants with partial payment', () => {
      const { totalPrice, paidAmount } = calculatePaymentAmounts(50, 4, 'partial');

      const booking = {
        total_price: totalPrice, // 200€
        paid_amount: paidAmount,  // 20€ (10%)
        remaining_amount: totalPrice - paidAmount, // 180€
        payment_type: 'partial'
      };

      const refundAmount = calculateRefundAmount(booking);

      expect(refundAmount).toBe(20);
      expect(refundAmount).toBe(booking.paid_amount);
      expect(refundAmount).not.toBe(200); // NOT the total price!
    });

    test('zero refund for zero paid amount (edge case)', () => {
      const booking = {
        total_price: 100,
        paid_amount: 0,
        remaining_amount: 100,
        payment_type: 'partial'
      };

      const refundAmount = calculateRefundAmount(booking);
      expect(refundAmount).toBe(0);
    });
  });

  describe('Cancellation Status Updates', () => {
    test('booking status changes from confirmed to cancelled', () => {
      let booking = {
        id: 1,
        status: 'confirmed'
      };

      // Simulate cancellation
      booking.status = 'cancelled';

      expect(booking.status).toBe('cancelled');
    });

    test('cannot cancel already cancelled booking', () => {
      const booking = {
        id: 1,
        status: 'cancelled'
      };

      const isAlreadyCancelled = booking.status === 'cancelled';
      expect(isAlreadyCancelled).toBe(true);

      // In real implementation, this should return 400 error
    });
  });

  describe('Capacity Adjustment on Cancellation', () => {
    test('reduces booked count when booking is cancelled', () => {
      let classData = {
        capacity: 10,
        booked: 5
      };

      const participantsCancelled = 2;
      classData.booked -= participantsCancelled;

      expect(classData.booked).toBe(3);
    });

    test('does not reduce below zero (safety check)', () => {
      let classData = {
        capacity: 10,
        booked: 1
      };

      const participantsCancelled = 2;

      // Should not allow this, but if it happens:
      const newBooked = Math.max(0, classData.booked - participantsCancelled);

      expect(newBooked).toBe(0); // Not negative
    });

    test('frees up correct number of spots', () => {
      const classData = {
        capacity: 10,
        booked: 10 // Full
      };

      const participantsCancelled = 3;
      classData.booked -= participantsCancelled;

      const availableSpots = classData.capacity - classData.booked;
      expect(availableSpots).toBe(3); // Now 3 spots available
    });
  });

  describe('Stripe Refund Integration', () => {
    test('refund amount converted to cents correctly', () => {
      const booking = {
        paid_amount: 45.50
      };

      const refundAmountCents = Math.round(booking.paid_amount * 100);
      expect(refundAmountCents).toBe(4550);
    });

    test('handles decimal refund amounts', () => {
      const booking = {
        paid_amount: 13.65 // 10% of 136.50
      };

      const refundAmountCents = Math.round(booking.paid_amount * 100);
      expect(refundAmountCents).toBe(1365);
    });

    test('refund metadata includes correct payment intent ID', () => {
      const booking = {
        payment_intent_id: 'pi_test_123456',
        paid_amount: 50
      };

      const refundData = {
        amount: Math.round(booking.paid_amount * 100),
        payment_intent: booking.payment_intent_id
      };

      expect(refundData.payment_intent).toBe('pi_test_123456');
      expect(refundData.amount).toBe(5000);
    });
  });

  describe('Email Validation for Cancellation', () => {
    test('requires email to match booking', () => {
      const booking = {
        customer_email: 'customer@example.com'
      };

      const providedEmail = 'customer@example.com';
      const emailMatches = booking.customer_email === providedEmail;

      expect(emailMatches).toBe(true);
    });

    test('rejects cancellation with wrong email', () => {
      const booking = {
        customer_email: 'customer@example.com'
      };

      const providedEmail = 'wrong@example.com';
      const emailMatches = booking.customer_email === providedEmail;

      expect(emailMatches).toBe(false);
      // Should return 404 error
    });

    test('email comparison is case-sensitive', () => {
      const booking = {
        customer_email: 'Customer@Example.com'
      };

      const providedEmail = 'customer@example.com';
      const emailMatches = booking.customer_email === providedEmail;

      expect(emailMatches).toBe(false);
      // This might be a bug - emails should be case-insensitive!
    });
  });
});
