# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cooking school booking system with Stripe payment integration. The application allows users to browse cooking classes, make bookings with payment, and manage their reservations. It's built as a simple Node.js/Express backend with a vanilla JavaScript frontend.

**Language:** Russian (Русский) - all UI text, comments, and user-facing content is in Russian.

## Architecture

### High-Level Structure

The system follows a **client-server architecture with in-memory data storage**:

- **Frontend:** Single-page application in vanilla JavaScript (index.html)
- **Backend:** Express.js REST API (server.js) with Stripe integration
- **Data Storage:** In-memory arrays (classes and bookings) - **NOT persistent across restarts**
- **Payment Processing:** Stripe Payment Intents API with webhook support

### Key Files

- `index.html` - Full frontend with Stripe integration (requires running server)
- `admin.html` - Administrative panel for managing classes (CRUD operations)
- `demo.html` - Standalone demo version that works without a server
- `server.js` - Complete backend API with all endpoints and business logic
- `.env` - Configuration for Stripe keys and environment variables

### Data Flow

1. User browses classes → Frontend fetches from `/api/classes`
2. User selects class and participants → Validates availability
3. Frontend creates Payment Intent → `/api/create-payment-intent`
4. Stripe.js handles payment UI → Returns payment confirmation
5. Frontend confirms booking → `/api/confirm-booking` updates class capacity
6. Webhook receives Stripe events → `/webhook` for async payment status

### Important Architectural Decisions

**In-Memory Storage:** All data (classes, bookings) is stored in JavaScript arrays. This means:
- Data is lost when the server restarts
- No concurrent request handling beyond Node.js single-threaded nature
- For production, migration to PostgreSQL/MongoDB is recommended (schema provided in README.md:196)

**No Authentication:** The system has no user authentication. Bookings are identified by email only. The admin panel is also unprotected and accessible to anyone.

**Capacity Management:** Classes have `capacity` and `booked` fields. The system checks availability before creating payment intents but doesn't lock spots during payment, creating a potential race condition.

## Development Commands

### Starting the Server

```bash
# Install dependencies (first time only)
npm install

# Start server (production mode)
npm start

# Start with auto-reload (requires nodemon)
npm run dev
```

Server runs on `http://localhost:3000` (configurable via PORT in .env)

### Testing

```bash
# No test suite currently implemented
npm test  # Will show "Error: no test specified"
```

### Stripe Configuration

Before running, configure Stripe keys:

1. Copy `.env.example` to `.env`
2. Add your Stripe keys from https://dashboard.stripe.com/apikeys:
   - `STRIPE_SECRET_KEY` - for server.js (sk_test_...)
   - `STRIPE_PUBLISHABLE_KEY` - for both .env and index.html

3. Update `STRIPE_PUBLIC_KEY` constant in index.html (line ~70) with your publishable key

### Testing Payments

Use Stripe test cards (test mode only):
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Webhook Testing (Local Development)

```bash
# Install Stripe CLI
# Then forward webhook events to local server
stripe listen --forward-to localhost:3000/webhook
```

## API Endpoints Reference

All endpoints use `/api` prefix except `/webhook`:

### Admin Endpoints (Class Management)

| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|--------------|
| GET | `/api/classes` | List all classes | - |
| GET | `/api/classes/:id` | Get specific class | - |
| POST | `/api/classes` | Create new class | `{title, description, date, time, duration, price, capacity, instructor}` |
| PUT | `/api/classes/:id` | Update existing class | `{title, description, date, time, duration, price, capacity, instructor, booked}` |
| DELETE | `/api/classes/:id` | Delete class | - |

**Note:** DELETE will fail if there are active bookings for the class. PUT validates that new capacity is not less than current bookings.

### Booking Endpoints

| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|--------------|
| POST | `/api/create-payment-intent` | Create Stripe payment | `{classId, participants, email, name}` |
| POST | `/api/confirm-booking` | Confirm after payment | `{paymentIntentId, classId, name, email, phone, participants}` |
| POST | `/api/cancel-booking` | Cancel with refund | `{bookingId, email}` |
| GET | `/api/bookings` | Get all bookings | - |
| GET | `/api/bookings/email/:email` | User's bookings | - |
| POST | `/webhook` | Stripe webhook events | Raw Stripe event |

## Admin Panel

The system now includes a web-based administrative panel for managing classes.

### Accessing the Admin Panel

Open `admin.html` in a browser (with server running): `http://localhost:3000/admin.html` or `http://localhost:3001/admin.html`

**Important:** The admin panel has NO authentication - anyone with the URL can access it. For production, implement authentication/authorization.

### Admin Panel Features

- **Dashboard Statistics:** Total classes, total spots, booked spots, available spots
- **Class List:** View all classes with current booking status
- **Add Class:** Form to create new classes with all fields
- **Edit Class:** Modify existing class details
- **Delete Class:** Remove classes (blocked if there are active bookings)
- **Real-time Status Badges:** Visual indicators for class availability
  - Green (Есть места): < 75% full
  - Yellow (Почти заполнено): 75-99% full
  - Red (Заполнено): 100% full

### Managing Classes via Admin Panel

1. **Create:** Click "Добавить класс" button, fill form, save
2. **Edit:** Click "Изменить" button on any class row
3. **Delete:** Click "Удалить" button (confirms before deletion)
4. **Validation:** Required fields are marked with *

The admin panel automatically syncs with the API and updates the display.

## Code Patterns and Conventions

### Adding New Classes

**Option 1: Via Admin Panel (Recommended)**
- Open `admin.html` in browser
- Click "Добавить класс" button
- Fill in the form and save

**Option 2: Via Code (Legacy Method)**
Edit the `classes` array in server.js:

```javascript
{
    id: 7,  // Increment from last ID (or use API for auto-generation)
    title: "Название занятия",
    description: "Описание...",
    date: "2025-12-01",  // YYYY-MM-DD format
    time: "18:00",        // HH:MM format
    duration: "3 часа",
    price: 45,            // EUR, integer
    capacity: 12,
    booked: 0,            // Initial bookings
    instructor: "Имя Фамилия"
}
```

### Price Calculation

All prices are in EUR:
- Stored as integers (e.g., 45 = 45 EUR)
- Converted to cents for Stripe (multiply by 100)
- Total = `price * participants * 100` cents

### Capacity Logic

Before creating payment intent, server checks:
```javascript
const availableSpots = classItem.capacity - classItem.booked;
if (participants > availableSpots) {
    // Reject booking
}
```

After successful booking confirmation, capacity is updated:
```javascript
classItem.booked += participants;
```

### Error Handling

The codebase uses try-catch blocks with descriptive error messages. When adding new endpoints, follow this pattern:

```javascript
try {
    // Your logic here
    res.json({ success: true, data });
} catch (error) {
    console.error('Error description:', error);
    res.status(500).json({ error: error.message });
}
```

## Stripe Integration Details

### Payment Intent Flow

1. **Create:** POST to `/api/create-payment-intent` with class and participant info
2. **Client Confirms:** Frontend uses Stripe.js with returned `clientSecret`
3. **Webhook Notification:** Stripe sends `payment_intent.succeeded` to `/webhook`
4. **Booking Confirmation:** Frontend calls `/api/confirm-booking` with `paymentIntentId`

### Refund Process

When canceling a booking:
1. Find booking by ID and verify email
2. Retrieve Stripe PaymentIntent
3. Create refund via `stripe.refunds.create()`
4. Update booking status to 'cancelled'
5. Decrease class `booked` count

### Webhook Signature Verification

The webhook endpoint verifies Stripe signatures using `STRIPE_WEBHOOK_SECRET`. This is critical for security in production but can be skipped in development if the secret is not configured.

## Styling and UI

The frontend uses:
- **Colors:** Purple-blue gradient (`#667eea` → `#764ba2`)
- **Responsive Design:** CSS Grid + Flexbox with mobile breakpoints
- **No Framework:** Vanilla JavaScript, no build step required

To customize colors, search for hex values in the `<style>` section of index.html and replace them.

## Production Deployment Considerations

The README.md contains detailed deployment instructions. Key points:

- **Database:** Migrate from in-memory to PostgreSQL (schema provided in README.md:196-225)
- **Environment:** Use production Stripe keys (pk_live_, sk_live_)
- **Security:** Enable HTTPS, add rate limiting, restrict CORS origins
- **Email:** Integrate SendGrid/Mailgun for booking confirmations (setup in README.md:229-250)
- **Process Manager:** Use PM2 or similar to keep server running
- **Webhook:** Configure production webhook URL in Stripe Dashboard

## Known Limitations

- **No persistence:** Data lost on server restart
- **No authentication:** Anyone can view all bookings and access admin panel
- **Race condition:** Two users can book the last spot simultaneously
- **No email:** Email confirmation code is stubbed out
- **No tests:** No automated test suite
- **Single currency:** Only EUR supported

## Future Development Ideas

See README.md:367-379 for a comprehensive list including:
- ~~Admin panel for class management~~ ✅ **IMPLEMENTED** (admin.html)
- User accounts and authentication (including admin authentication)
- Promo codes and discount system
- Recurring classes/schedules
- Waitlist functionality
- Reviews and ratings
- Mobile app
