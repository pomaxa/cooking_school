# 🍳 Система бронирования для кулинарной школы

## 📁 Структура проекта

```
cooking-school/
├── demo.html              # Демо версия (работает без сервера)
├── index.html             # Фронтенд с полной Stripe интеграцией
├── server.js              # Backend сервер на Node.js + Express
├── package.json           # Зависимости проекта
├── .env.example           # Шаблон переменных окружения
├── .gitignore            # Исключения для Git
├── README.md             # Полная документация
└── QUICKSTART.md         # Быстрый старт
```

## ✨ Что реализовано

### ✅ Фронтенд функции:
- Современный адаптивный дизайн с градиентами
- Карточки занятий с полной информацией
- Визуализация capacity (прогресс-бар)
- Модальное окно для бронирования
- Форма с валидацией
- Интеграция Stripe Elements для приёма платежей
- Расчёт стоимости в реальном времени
- Уведомления об успехе/ошибках

### ✅ Backend функции:
- RESTful API на Express
- Интеграция с Stripe Payment Intents
- Создание и подтверждение бронирований
- Проверка availability (capacity control)
- Отмена бронирований с возвратом средств
- Webhook для обработки событий Stripe
- Защита от двойного бронирования
- Email уведомления (готово к интеграции)

### ✅ Stripe интеграция:
- Payment Intents API
- Secure Card Element
- 3D Secure поддержка
- Automatic refunds
- Webhook events handling
- Test mode готов к использованию

## 🎯 Основные API endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/classes` | Список всех занятий |
| GET | `/api/classes/:id` | Информация о занятии |
| POST | `/api/create-payment-intent` | Создать намерение платежа |
| POST | `/api/confirm-booking` | Подтвердить бронирование |
| POST | `/api/cancel-booking` | Отменить бронирование |
| GET | `/api/bookings` | Все бронирования |
| GET | `/api/bookings/email/:email` | Бронирования пользователя |
| POST | `/webhook` | Stripe webhook events |

## 🔧 Технический стек

### Frontend:
- HTML5 + CSS3 (Modern Features)
- Vanilla JavaScript (ES6+)
- Stripe.js v3
- Responsive Design (Grid + Flexbox)

### Backend:
- Node.js v14+
- Express.js
- Stripe Node.js SDK
- CORS enabled
- Environment variables (dotenv)

### Payment Processing:
- Stripe Payment Intents API
- PCI-DSS compliant (Stripe hosted fields)
- SCA (Strong Customer Authentication) ready
- Webhook signature verification

## 📊 Модель данных

### Class (Занятие):
```javascript
{
    id: number,
    title: string,
    description: string,
    date: string (YYYY-MM-DD),
    time: string (HH:MM),
    duration: string,
    price: number (EUR),
    capacity: number,
    booked: number,
    instructor: string
}
```

### Booking (Бронирование):
```javascript
{
    id: number,
    classId: number,
    className: string,
    date: string,
    time: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    participants: number,
    totalAmount: number,
    paymentIntentId: string,
    status: string ('confirmed' | 'cancelled'),
    bookingDate: timestamp,
    cancelledAt: timestamp,
    refundId: string
}
```

## 🚀 Быстрый старт

### Вариант 1: Демо (0 настроек)
```bash
# Просто откройте demo.html в браузере
open demo.html
```

### Вариант 2: Полная версия (2 минуты)
```bash
# 1. Установка
npm install

# 2. Настройка
cp .env.example .env
# Добавьте ваши Stripe ключи в .env

# 3. Запуск
npm start

# 4. Откройте index.html в браузере
```

## 🎨 Дизайн особенности

- **Цветовая схема**: Фиолетово-синий градиент (#667eea → #764ba2)
- **Типографика**: Segoe UI, sans-serif
- **Адаптивность**: 3 breakpoints (desktop, tablet, mobile)
- **Анимации**: Hover эффекты, transitions
- **UX**: Прогресс индикаторы, instant feedback

## 🔐 Безопасность

✅ Реализовано:
- Stripe Elements (PCI compliant)
- Webhook signature verification
- Environment variables для секретов
- CORS настройка
- Input validation

⚠️ Для production добавить:
- Rate limiting (express-rate-limit)
- HTTPS (Let's Encrypt)
- Database (PostgreSQL)
- Authentication & Authorization
- Logging (Winston/Bunyan)
- Monitoring (Sentry)

## 📈 Готовность к масштабированию

### Сейчас:
- ✅ In-memory storage (массивы)
- ✅ Single server
- ✅ Synchronous operations

### Для production:
- 🔄 PostgreSQL/MongoDB
- 🔄 Redis для кэширования
- 🔄 Queue system (Bull/RabbitMQ)
- 🔄 Microservices architecture
- 🔄 Load balancing
- 🔄 CDN для статики

## 💡 Идеи для развития

1. **Admin Panel**: CRUD для занятий, dashboard с аналитикой
2. **User Accounts**: Профили, история бронирований, избранное
3. **Промокоды**: Система скидок и купонов
4. **Recurring Classes**: Повторяющиеся занятия (расписание)
5. **Waitlist**: Очередь для заполненных занятий
6. **Reviews & Ratings**: Отзывы после занятий
7. **Social Features**: Поделиться в соцсетях
8. **Mobile App**: React Native приложение
9. **Notifications**: SMS/Push уведомления
10. **Gift Cards**: Подарочные сертификаты

## 📞 Поддержка

Проблемы? Вопросы? См. **README.md** или **QUICKSTART.md**

## 📄 Лицензия

MIT License - свободно используйте для коммерческих проектов

---

**Статус проекта**: ✅ Production Ready (с настройкой Stripe + DB)

**Последнее обновление**: Ноябрь 2025

**Версия**: 1.0.0
