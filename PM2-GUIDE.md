# PM2 Deployment Guide

## Установка PM2

Если PM2 еще не установлен, установите его глобально:

```bash
npm install -g pm2
```

## Основные команды

### Запуск приложения

```bash
# Запустить с помощью npm script
npm run pm2:start

# Или напрямую
pm2 start ecosystem.config.js
```

### Остановка приложения

```bash
npm run pm2:stop
```

### Перезапуск приложения

```bash
# Перезапуск (останавливает и запускает заново)
npm run pm2:restart

# Перезагрузка без даунтайма (для cluster mode)
npm run pm2:reload
```

### Просмотр логов

```bash
# Все логи в реальном времени
npm run pm2:logs

# Только последние 200 строк
pm2 logs cooking-school --lines 200

# Очистить логи
pm2 flush
```

### Мониторинг

```bash
# Список всех процессов
npm run pm2:status

# Интерактивный мониторинг
npm run pm2:monit
```

### Удаление из PM2

```bash
npm run pm2:delete
```

## Автозапуск при старте системы

### Настройка автозапуска

```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск для вашей ОС
pm2 startup
# Следуйте инструкциям в выводе команды
```

### Отключить автозапуск

```bash
pm2 unstartup
```

## Production деплой

### Запуск в production режиме

```bash
pm2 start ecosystem.config.js --env production
```

### Кластерный режим (для высоких нагрузок)

Измените в `ecosystem.config.js`:

```javascript
instances: 'max', // или конкретное число, например 4
exec_mode: 'cluster'
```

Затем:

```bash
pm2 reload ecosystem.config.js --env production
```

## Полезные команды

```bash
# Посмотреть информацию о процессе
pm2 show cooking-school

# Посмотреть метрики производительности
pm2 monit

# Очистить все логи
pm2 flush

# Перезагрузить конфигурацию
pm2 reload ecosystem.config.js

# Масштабирование (добавить инстансы)
pm2 scale cooking-school +2

# Сбросить счетчик перезапусков
pm2 reset cooking-school
```

## Логи

Логи сохраняются в:
- `./logs/error.log` - логи ошибок
- `./logs/out.log` - обычные логи

## Переменные окружения

Переменные берутся из `.env` файла. Для production можно использовать:

```bash
pm2 start ecosystem.config.js --env production
```

Это использует настройки из `env_production` в `ecosystem.config.js`.

## Мониторинг и алерты (опционально)

PM2 Plus - платформа мониторинга (опционально):

```bash
pm2 plus
```

## Troubleshooting

### Приложение не запускается

```bash
# Проверить логи ошибок
pm2 logs cooking-school --err

# Проверить статус
pm2 status
```

### Слишком много перезапусков

Проверьте:
- Логи ошибок: `pm2 logs cooking-school --err`
- Настройки в `ecosystem.config.js`
- Файл `.env` существует и содержит правильные данные

### Очистить все и начать заново

```bash
pm2 delete all
pm2 kill
npm run pm2:start
```

## Полезные ссылки

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
