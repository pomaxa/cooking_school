// server.js - Backend для обработки платежей Stripe
require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { classesDb, bookingsDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy when behind Nginx/load balancer
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        path: '/'
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

// Старые массивы закомментированы - теперь используем SQLite
// База данных (в production используйте PostgreSQL/MongoDB)
/* let classes = [
    {
        id: 1,
        title: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        description: {
            ru: "Научитесь готовить настоящую пасту карбонара и альо олио с секретами итальянских шефов",
            lv: "Iemācieties gatavot īstu karbonāras un alio olio pastu ar itāļu pavāru noslēpumiem"
        },
        instructor: {
            ru: "Марко Росси",
            lv: "Marko Rossi"
        },
        languages: ['ru', 'lv'],
        date: "2025-11-15",
        time: "18:00",
        duration: "3 часа",
        price: 45,
        capacity: 12,
        booked: 8
    },
    {
        id: 2,
        title: {
            ru: "Французские десерты",
            lv: "Franču deserti"
        },
        description: {
            ru: "Мастер-класс по приготовлению классических французских десертов",
            lv: "Meistarklase klasisko franču desertu gatavošanā"
        },
        instructor: {
            ru: "Мари Дюбуа",
            lv: "Mari Djubā"
        },
        languages: ['ru', 'lv'],
        date: "2025-11-22",
        time: "13:00",
        duration: "4 часа",
        price: 40,
        capacity: 12,
        booked: 0
    }
];

let bookings = [
    {
        id: 1,
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        date: "2025-11-15",
        time: "18:00",
        customerName: "Анна Петрова",
        customerEmail: "anna.petrova@example.com",
        customerPhone: "+371 29123456",
        participants: 2,
        totalAmount: 90,
        paymentIntentId: "pi_test_123456",
        bookingDate: "2025-11-01T10:30:00.000Z",
        status: "confirmed"
    },
    {
        id: 2,
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        date: "2025-11-15",
        time: "18:00",
        customerName: "Иван Сидоров",
        customerEmail: "ivan.sidorov@example.com",
        customerPhone: "+371 29234567",
        participants: 1,
        totalAmount: 45,
        paymentIntentId: "pi_test_234567",
        bookingDate: "2025-11-02T14:20:00.000Z",
        status: "confirmed"
    },
    {
        id: 3,
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        date: "2025-11-15",
        time: "18:00",
        customerName: "Мария Козлова",
        customerEmail: "maria.kozlova@example.com",
        customerPhone: "+371 29345678",
        participants: 2,
        totalAmount: 90,
        paymentIntentId: "pi_test_345678",
        bookingDate: "2025-11-03T09:15:00.000Z",
        status: "confirmed"
    },
    {
        id: 4,
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        date: "2025-11-15",
        time: "18:00",
        customerName: "Дмитрий Новиков",
        customerEmail: "dmitry.novikov@example.com",
        customerPhone: "+371 29456789",
        participants: 3,
        totalAmount: 135,
        paymentIntentId: "pi_test_456789",
        bookingDate: "2025-11-04T16:45:00.000Z",
        status: "confirmed"
    }
]; */

// API Endpoints

// Configuration endpoint for frontend
app.get('/config', (req, res) => {
    res.json({
        apiUrl: process.env.API_BASE_URL || '/api',
        stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });
});

// Admin Authentication
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Check username
        if (username !== process.env.ADMIN_USERNAME) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.isAdmin = true;
        req.session.username = username;

        // Save session before responding (important for production)
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Failed to create session' });
            }
            res.json({ success: true, message: 'Logged in successfully' });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.get('/api/admin/check', (req, res) => {
    // Debug logging for session issues
    if (process.env.NODE_ENV === 'development') {
        console.log('Session check:', {
            hasSession: !!req.session,
            isAdmin: req.session?.isAdmin,
            sessionID: req.sessionID
        });
    }

    if (req.session && req.session.isAdmin) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Получить все классы
app.get('/api/classes', async (req, res) => {
    try {
        const classes = await classesDb.getAll();
        res.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить конкретный класс
app.get('/api/classes/:id', async (req, res) => {
    try {
        const classItem = await classesDb.getById(parseInt(req.params.id));
        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }
        res.json(classItem);
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создать новый класс (Admin)
app.post('/api/classes', requireAuth, async (req, res) => {
    try {
        const { title, description, date, time, duration, price, capacity, instructor, languages, audienceType } = req.body;

        // Валидация
        if (!title || !date || !time || !price || !capacity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Создать класс в базе данных
        const result = await classesDb.create({
            title,
            description: description || { ru: '', lv: '' },
            instructor: instructor || { ru: '', lv: '' },
            languages: languages || ['ru', 'lv'],
            date,
            time,
            duration: duration || '',
            price: parseFloat(price),
            capacity: parseInt(capacity),
            audienceType: audienceType || 'mixed'
        });

        // Получить созданный класс
        const newClass = await classesDb.getById(result.id);

        res.json({
            success: true,
            class: newClass,
            message: 'Class created successfully'
        });

    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить класс (Admin)
app.put('/api/classes/:id', requireAuth, async (req, res) => {
    try {
        const classId = parseInt(req.params.id);
        const classItem = await classesDb.getById(classId);

        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const { title, description, date, time, duration, price, capacity, instructor, languages, audienceType } = req.body;

        // Проверить capacity
        if (capacity !== undefined) {
            const newCapacity = parseInt(capacity);
            if (newCapacity < classItem.booked) {
                return res.status(400).json({
                    error: 'Cannot set capacity lower than current bookings',
                    currentBooked: classItem.booked
                });
            }
        }

        // Обновить класс в базе данных
        await classesDb.update(classId, {
            title: title !== undefined ? title : classItem.title,
            description: description !== undefined ? description : classItem.description,
            instructor: instructor !== undefined ? instructor : classItem.instructor,
            languages: languages !== undefined ? languages : classItem.languages,
            date: date !== undefined ? date : classItem.date,
            time: time !== undefined ? time : classItem.time,
            duration: duration !== undefined ? duration : classItem.duration,
            price: price !== undefined ? parseFloat(price) : classItem.price,
            capacity: capacity !== undefined ? parseInt(capacity) : classItem.capacity,
            audienceType: audienceType !== undefined ? audienceType : classItem.audienceType
        });

        // Получить обновленный класс
        const updatedClass = await classesDb.getById(classId);

        res.json({
            success: true,
            class: updatedClass,
            message: 'Class updated successfully'
        });

    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить класс (Admin)
app.delete('/api/classes/:id', requireAuth, async (req, res) => {
    try {
        const classId = parseInt(req.params.id);
        const classItem = await classesDb.getById(classId);

        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Проверить, есть ли активные бронирования
        const classBookings = await bookingsDb.getByClassId(classId);
        const activeBookings = classBookings.filter(b => b.status === 'confirmed');

        if (activeBookings.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete class with active bookings',
                activeBookings: activeBookings.length
            });
        }

        // Удалить класс
        await classesDb.delete(classId);

        res.json({
            success: true,
            class: classItem,
            message: 'Class deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создать Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { classId, participants, email, name, paymentType } = req.body;

        // Найти класс
        const classItem = await classesDb.getById(classId);
        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Проверить доступность мест
        const availableSpots = classItem.capacity - classItem.booked;
        if (participants > availableSpots) {
            return res.status(400).json({
                error: 'Not enough spots available',
                availableSpots
            });
        }

        // Рассчитать стоимость в зависимости от типа оплаты
        const totalPrice = classItem.price * participants;
        const paymentAmount = paymentType === 'partial'
            ? Math.round(totalPrice * 0.1 * 100) / 100  // 10% для частичной оплаты
            : totalPrice;
        const amountInCents = Math.round(paymentAmount * 100); // в центах

        // Get title in Russian for description
        const titleRu = typeof classItem.title === 'object' ? classItem.title.ru : classItem.title;
        const paymentTypeText = paymentType === 'partial' ? ' (депозит 10%)' : '';

        // Создать Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            metadata: {
                classId: classId,
                className: JSON.stringify(classItem.title),
                participants: participants,
                customerEmail: email,
                customerName: name,
                paymentType: paymentType || 'full',
                totalPrice: totalPrice,
                paidAmount: paymentAmount,
                remainingAmount: totalPrice - paymentAmount
            },
            receipt_email: email,
            description: `Бронирование: ${titleRu} для ${participants} чел.${paymentTypeText}`
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Подтвердить бронирование после успешной оплаты
app.post('/api/confirm-booking', async (req, res) => {
    try {
        const {
            paymentIntentId,
            classId,
            name,
            email,
            phone,
            participants,
            paymentType
        } = req.body;

        // Проверить статус платежа
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                error: 'Payment not completed',
                status: paymentIntent.status
            });
        }

        // Найти класс
        const classItem = await classesDb.getById(classId);
        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Проверить доступность мест
        const availableSpots = classItem.capacity - classItem.booked;
        if (participants > availableSpots) {
            // Возврат средств, если мест нет
            await stripe.refunds.create({
                payment_intent: paymentIntentId,
            });
            return res.status(400).json({
                error: 'Not enough spots available. Payment refunded.',
                availableSpots
            });
        }

        // Обновить количество забронированных мест
        await classesDb.incrementBooked(classId, participants);

        // Рассчитать суммы
        const totalPrice = classItem.price * participants;
        const paidAmount = paymentType === 'partial'
            ? Math.round(totalPrice * 0.1 * 100) / 100
            : totalPrice;
        const remainingAmount = totalPrice - paidAmount;

        // Создать запись о бронировании
        const bookingResult = await bookingsDb.create({
            classId: classId,
            className: classItem.title,
            customerName: name,
            email: email,
            phone: phone,
            participants: participants,
            totalPrice: totalPrice,
            paymentType: paymentType || 'full',
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            paymentIntentId: paymentIntentId
        });

        // Получить созданное бронирование
        const booking = await bookingsDb.getById(bookingResult.id);

        // Отправить email подтверждение (интеграция с email сервисом)
        await sendConfirmationEmail(booking);

        res.json({
            success: true,
            booking: booking,
            message: 'Booking confirmed successfully'
        });

    } catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить бронирования (Admin)
app.get('/api/bookings', requireAuth, async (req, res) => {
    try {
        const bookings = await bookingsDb.getAll();
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить бронирование по email (Public)
app.get('/api/bookings/email/:email', async (req, res) => {
    try {
        const userBookings = await bookingsDb.getByEmail(req.params.email);
        res.json(userBookings);
    } catch (error) {
        console.error('Error fetching bookings by email:', error);
        res.status(500).json({ error: error.message });
    }
});

// Отменить бронирование
app.post('/api/cancel-booking', async (req, res) => {
    try {
        const { bookingId, email } = req.body;

        const booking = await bookingsDb.getById(bookingId);

        if (!booking || booking.email !== email) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Booking already cancelled' });
        }

        // Получить информацию о классе
        const classItem = await classesDb.getById(booking.classId);

        // Проверить, можно ли отменить (например, за 24 часа до занятия)
        const classDate = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        const hoursUntilClass = (classDate - now) / (1000 * 60 * 60);

        if (hoursUntilClass < 24) {
            return res.status(400).json({
                error: 'Cannot cancel less than 24 hours before the class'
            });
        }

        // Возврат средств
        const refund = await stripe.refunds.create({
            payment_intent: booking.paymentIntentId,
            amount: booking.totalPrice * 100, // в центах
        });

        // Обновить статус бронирования
        await bookingsDb.updateStatus(bookingId, 'cancelled');

        // Освободить места
        await classesDb.decrementBooked(booking.classId, booking.participants);

        // Получить обновленное бронирование
        const updatedBooking = await bookingsDb.getById(bookingId);

        // Отправить email о отмене
        await sendCancellationEmail(updatedBooking);

        res.json({
            success: true,
            message: 'Booking cancelled and refund processed',
            refund: refund
        });

    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook для обработки событий Stripe
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Обработка различных событий
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            // Дополнительная логика при успешном платеже
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            // Обработка неудачного платежа
            break;

        case 'charge.refunded':
            const refund = event.data.object;
            console.log('Refund processed:', refund.id);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Функция отправки email подтверждения (заглушка)
async function sendConfirmationEmail(booking) {
    // Интеграция с SendGrid, Mailgun, AWS SES и т.д.
    console.log('Sending confirmation email to:', booking.customerEmail);
    console.log('Booking details:', booking);
    
    // Пример с использованием SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
        to: booking.customerEmail,
        from: 'info@cookingschool.com',
        subject: `Подтверждение бронирования: ${booking.className}`,
        html: `
            <h2>Спасибо за бронирование!</h2>
            <p>Здравствуйте, ${booking.customerName}!</p>
            <p>Ваше бронирование подтверждено:</p>
            <ul>
                <li>Занятие: ${booking.className}</li>
                <li>Дата: ${booking.date}</li>
                <li>Время: ${booking.time}</li>
                <li>Участников: ${booking.participants}</li>
                <li>Сумма оплаты: €${booking.totalAmount}</li>
            </ul>
            <p>Ждём вас на занятии!</p>
        `
    };
    
    await sgMail.send(msg);
    */
}

// Функция отправки email об отмене (заглушка)
async function sendCancellationEmail(booking) {
    console.log('Sending cancellation email to:', booking.customerEmail);
    console.log('Cancelled booking:', booking);
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  GET    /api/classes');
    console.log('  GET    /api/classes/:id');
    console.log('  POST   /api/classes (Admin)');
    console.log('  PUT    /api/classes/:id (Admin)');
    console.log('  DELETE /api/classes/:id (Admin)');
    console.log('  POST   /api/create-payment-intent');
    console.log('  POST   /api/confirm-booking');
    console.log('  POST   /api/cancel-booking');
    console.log('  POST   /webhook');
});

module.exports = app;
