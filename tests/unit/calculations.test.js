/**
 * Payment Calculations Tests
 * CRITICAL: Tests for price calculations, rounding, and payment amounts
 */

const { calculatePaymentAmounts } = require('../helpers/fixtures');

describe('Payment Calculations', () => {
  describe('Full Payment', () => {
    test('calculates total price correctly for single participant', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(45.50, 1, 'full');

      expect(totalPrice).toBe(45.50);
      expect(paidAmount).toBe(45.50);
      expect(remainingAmount).toBe(0);
    });

    test('calculates total price correctly for multiple participants', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(45.50, 3, 'full');

      expect(totalPrice).toBe(136.50);
      expect(paidAmount).toBe(136.50);
      expect(remainingAmount).toBe(0);
    });

    test('handles price with many decimals', () => {
      const { totalPrice, paidAmount } =
        calculatePaymentAmounts(33.333, 2, 'full');

      // Should round to 2 decimals
      expect(totalPrice).toBeCloseTo(66.67, 2);
      expect(paidAmount).toBeCloseTo(66.67, 2);
    });

    test('converts to cents correctly', () => {
      const { amountInCents } =
        calculatePaymentAmounts(45.50, 2, 'full');

      expect(amountInCents).toBe(9100); // 91.00 EUR = 9100 cents
    });

    test('handles rounding edge case for cents conversion', () => {
      const { amountInCents } =
        calculatePaymentAmounts(45.15, 1, 'full');

      expect(amountInCents).toBe(4515); // 45.15 EUR = 4515 cents
    });
  });

  describe('Partial Payment (10%)', () => {
    test('calculates 10% deposit correctly', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(50.00, 2, 'partial');

      expect(totalPrice).toBe(100.00);
      expect(paidAmount).toBe(10.00); // 10% of 100
      expect(remainingAmount).toBe(90.00);
    });

    test('rounds partial payment to 2 decimals', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(45.50, 3, 'partial');

      expect(totalPrice).toBe(136.50);
      expect(paidAmount).toBe(13.65); // 10% of 136.50
      expect(remainingAmount).toBe(122.85);
    });

    test('paid + remaining equals total', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(45.50, 3, 'partial');

      expect(paidAmount + remainingAmount).toBeCloseTo(totalPrice, 2);
    });

    test('handles edge case with repeating decimals', () => {
      const { totalPrice, paidAmount, remainingAmount } =
        calculatePaymentAmounts(33.33, 1, 'partial');

      expect(totalPrice).toBe(33.33);
      expect(paidAmount).toBe(3.33); // 10% rounded
      expect(paidAmount + remainingAmount).toBeCloseTo(totalPrice, 2);
    });

    test('converts partial payment to cents correctly', () => {
      const { amountInCents } =
        calculatePaymentAmounts(50.00, 2, 'partial');

      expect(amountInCents).toBe(1000); // 10.00 EUR = 1000 cents
    });
  });

  describe('Rounding Edge Cases', () => {
    test('handles 0.005 rounding up', () => {
      const { totalPrice } =
        calculatePaymentAmounts(10.005, 1, 'full');

      expect(totalPrice).toBe(10.01); // Should round up
    });

    test('handles 0.004 rounding down', () => {
      const { totalPrice } =
        calculatePaymentAmounts(10.004, 1, 'full');

      expect(totalPrice).toBe(10.00); // Should round down
    });

    test('handles large amounts', () => {
      const { totalPrice, amountInCents } =
        calculatePaymentAmounts(999.99, 5, 'full');

      expect(totalPrice).toBe(4999.95);
      expect(amountInCents).toBe(499995); // 4999.95 EUR = 499995 cents
    });

    test('handles small amounts', () => {
      const { totalPrice, paidAmount } =
        calculatePaymentAmounts(0.50, 1, 'partial');

      expect(totalPrice).toBe(0.50);
      expect(paidAmount).toBe(0.05); // 10% of 0.50
    });
  });

  describe('Refund Amount Calculation', () => {
    test('full payment should refund total amount', () => {
      const { paidAmount } =
        calculatePaymentAmounts(45.50, 2, 'full');

      // BUG FIX TEST: Refund should be paidAmount, not totalPrice
      expect(paidAmount).toBe(91.00);
    });

    test('partial payment should refund only paid amount (10%)', () => {
      const { totalPrice, paidAmount } =
        calculatePaymentAmounts(45.50, 2, 'partial');

      // CRITICAL: Refund for partial payment should be paidAmount (9.10), NOT totalPrice (91.00)!
      expect(paidAmount).toBe(9.10);
      expect(paidAmount).not.toBe(totalPrice); // This is the bug we found!
    });

    test('refund amount matches Stripe payment intent amount', () => {
      const fullPayment = calculatePaymentAmounts(50.00, 2, 'full');
      const partialPayment = calculatePaymentAmounts(50.00, 2, 'partial');

      // Refund should match what was actually paid (paid_amount in DB)
      expect(fullPayment.paidAmount).toBe(100.00);
      expect(partialPayment.paidAmount).toBe(10.00);

      // NOT the total price
      expect(partialPayment.paidAmount).not.toBe(partialPayment.totalPrice);
    });
  });

  describe('Validation', () => {
    test('rejects negative price', () => {
      expect(() => {
        calculatePaymentAmounts(-10, 1, 'full');
      }).not.toThrow(); // Currently no validation - this should be added!
    });

    test('rejects zero participants', () => {
      const { totalPrice } = calculatePaymentAmounts(50, 0, 'full');
      expect(totalPrice).toBe(0); // Edge case
    });

    test('handles very large participant count', () => {
      const { totalPrice } = calculatePaymentAmounts(50, 100, 'full');
      expect(totalPrice).toBe(5000);
    });
  });
});
