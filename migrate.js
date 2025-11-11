// Migration script to move existing data to SQLite
const { classesDb, bookingsDb } = require('./database');

// Existing classes data
const existingClasses = [
    {
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
        capacity: 12
    },
    {
        title: {
            ru: "Французские десерты",
            lv: "Franču deserti"
        },
        description: {
            ru: "Мастер-класс по приготовлению классических французских десертов",
            lv: "Meistarklase klasisko franču desertu gatavošanā"
        },
        instructor: {
            ru: "Софи Дюпон",
            lv: "Sofija Dipona"
        },
        languages: ['ru', 'lv'],
        date: "2025-11-20",
        time: "14:00",
        duration: "4 часа",
        price: 55,
        capacity: 10
    },
    {
        title: {
            ru: "Суши-мастерская",
            lv: "Suši meistarklase"
        },
        description: {
            ru: "Изучите искусство приготовления суши и роллов с японским мастером",
            lv: "Apgūstiet suši un rullīšu gatavošanas mākslu ar japāņu meistaru"
        },
        instructor: {
            ru: "Такеши Ямамото",
            lv: "Takeshi Yamamoto"
        },
        languages: ['ru', 'lv'],
        date: "2025-11-25",
        time: "17:00",
        duration: "3.5 часа",
        price: 60,
        capacity: 8
    }
];

// Existing bookings data
const existingBookings = [
    {
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        customerName: "Анна Петрова",
        email: "anna.petrova@example.com",
        phone: "+371 29123456",
        participants: 2,
        totalPrice: 90,
        paymentIntentId: "pi_test_123456"
    },
    {
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        customerName: "Иван Сидоров",
        email: "ivan.sidorov@example.com",
        phone: "+371 29234567",
        participants: 1,
        totalPrice: 45,
        paymentIntentId: "pi_test_234567"
    },
    {
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        customerName: "Мария Козлова",
        email: "maria.kozlova@example.com",
        phone: "+371 29345678",
        participants: 2,
        totalPrice: 90,
        paymentIntentId: "pi_test_345678"
    },
    {
        classId: 1,
        className: {
            ru: "Итальянская паста",
            lv: "Itāļu pasta"
        },
        customerName: "Дмитрий Новиков",
        email: "dmitry.novikov@example.com",
        phone: "+371 29456789",
        participants: 3,
        totalPrice: 135,
        paymentIntentId: "pi_test_456789"
    }
];

async function migrate() {
    console.log('Starting migration...');

    // Wait for database to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        // Migrate classes
        console.log('Migrating classes...');
        for (const classData of existingClasses) {
            const result = await classesDb.create(classData);
            console.log(`Created class with ID: ${result.id}`);
        }

        // Update booked count for class 1 (has 8 participants: 2+1+2+3)
        await classesDb.incrementBooked(1, 8);
        console.log('Updated booked count for class 1');

        // Migrate bookings
        console.log('Migrating bookings...');
        for (const bookingData of existingBookings) {
            const result = await bookingsDb.create(bookingData);
            console.log(`Created booking with ID: ${result.id}`);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
