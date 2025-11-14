/**
 * Test Fixtures and Data Generators
 */

// Generate random data without faker for now to avoid ES module issues
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomEmail() {
  return `test${randomInt(1000, 9999)}@example.com`;
}

function randomPhone() {
  return `+371 ${randomInt(2000, 9999)} ${randomInt(1000, 9999)}`;
}

function randomName() {
  const names = ['John Smith', 'Jane Doe', 'Alice Johnson', 'Bob Williams'];
  return names[randomInt(0, names.length - 1)];
}

function randomTitle() {
  const titles = {
    ru: ['Итальянская паста', 'Французские десерты', 'Японская кухня', 'Испанская паэлья'],
    lv: ['Itāļu pasta', 'Franču deserti', 'Japāņu virtuve', 'Spāņu paēlja']
  };
  const index = randomInt(0, titles.ru.length - 1);
  return { ru: titles.ru[index], lv: titles.lv[index] };
}

function randomDate() {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, 365));
  return date.toISOString().split('T')[0];
}

function randomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length - 1));
  }
  return result;
}

/**
 * Generate a test class object
 */
function createTestClass(overrides = {}) {
  const title = randomTitle();
  return {
    title_ru: title.ru,
    title_lv: title.lv,
    description_ru: 'Test description in Russian',
    description_lv: 'Test description in Latvian',
    instructor_ru: randomName(),
    instructor_lv: randomName(),
    languages: JSON.stringify(['ru', 'lv']),
    date: randomDate(),
    time: '18:00',
    duration: '3 часа',
    price: randomFloat(30, 100),
    capacity: randomInt(5, 20),
    booked: 0,
    audience_type: 'mixed',
    ...overrides
  };
}

/**
 * Generate a test booking object
 */
function createTestBooking(classId, overrides = {}) {
  const participants = randomInt(1, 4);
  const price = randomFloat(30, 100);
  const totalPrice = price * participants;

  return {
    class_id: classId,
    class_name_ru: 'Итальянская паста',
    class_name_lv: 'Itāļu pasta',
    customer_name: randomName(),
    customer_email: randomEmail(),
    customer_phone: randomPhone(),
    participants,
    total_price: totalPrice,
    payment_intent_id: `pi_test_${randomAlphanumeric(24)}`,
    status: 'confirmed',
    allergies: '',
    payment_type: 'full',
    paid_amount: totalPrice,
    remaining_amount: 0,
    ...overrides
  };
}

/**
 * Generate Stripe payment intent mock
 */
function createMockPaymentIntent(amount, metadata = {}) {
  return {
    id: `pi_test_${randomAlphanumeric(24)}`,
    object: 'payment_intent',
    amount: Math.round(amount * 100),
    amount_capturable: 0,
    amount_received: Math.round(amount * 100),
    currency: 'eur',
    status: 'succeeded',
    client_secret: `pi_test_${randomAlphanumeric(24)}_secret_${randomAlphanumeric(24)}`,
    metadata: {
      classId: '1',
      participants: '2',
      totalPrice: amount.toString(),
      ...metadata
    },
    created: Math.floor(Date.now() / 1000)
  };
}

/**
 * Generate Stripe refund mock
 */
function createMockRefund(amount, paymentIntentId) {
  return {
    id: `re_test_${randomAlphanumeric(24)}`,
    object: 'refund',
    amount: Math.round(amount * 100),
    charge: `ch_test_${randomAlphanumeric(24)}`,
    currency: 'eur',
    payment_intent: paymentIntentId,
    status: 'succeeded',
    created: Math.floor(Date.now() / 1000)
  };
}

/**
 * Calculate payment amounts (mirroring server logic)
 */
function calculatePaymentAmounts(price, participants, paymentType = 'full') {
  const totalPrice = price * participants;
  const paidAmount = paymentType === 'partial'
    ? parseFloat((totalPrice * 0.1).toFixed(2))
    : totalPrice;
  const remainingAmount = paymentType === 'partial'
    ? parseFloat((totalPrice - paidAmount).toFixed(2))
    : 0;

  return {
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    paidAmount,
    remainingAmount,
    amountInCents: Math.round(paidAmount * 100)
  };
}

module.exports = {
  createTestClass,
  createTestBooking,
  createMockPaymentIntent,
  createMockRefund,
  calculatePaymentAmounts
};
