# PM2 Quick Start

## Первичная установка PM2

```bash
# Установить PM2 глобально (один раз)
npm install -g pm2
```

## Быстрые команды

### Запуск

```bash
# С помощью npm
npm run pm2:start

# С помощью shell скрипта
./pm2.sh start

# В production режиме
./pm2.sh production
```

### Управление

```bash
# Остановить
npm run pm2:stop

# Перезапустить
npm run pm2:restart

# Посмотреть логи
npm run pm2:logs

# Статус
npm run pm2:status
```

### Автозапуск при старте системы

```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск
pm2 startup
# Следуйте инструкциям в выводе команды

# После настройки, снова сохраните список
pm2 save
```

## Полезные команды shell скрипта

```bash
./pm2.sh start       # Запустить
./pm2.sh stop        # Остановить
./pm2.sh restart     # Перезапустить
./pm2.sh logs        # Логи
./pm2.sh status      # Статус
./pm2.sh production  # Production режим
./pm2.sh monit       # Мониторинг в реальном времени
```

## Просмотр логов

```bash
# Логи в реальном времени
npm run pm2:logs

# Последние 200 строк
pm2 logs cooking-school --lines 200

# Очистить логи
pm2 flush

# Файлы логов
ls -la logs/
```

## Проверка работы

```bash
# Статус процесса
npm run pm2:status

# Детальная информация
pm2 show cooking-school

# Открыть приложение в браузере
open http://localhost:3001
```

## Troubleshooting

### Процесс не запускается

```bash
# Проверить логи ошибок
pm2 logs cooking-school --err

# Удалить и запустить заново
npm run pm2:delete
npm run pm2:start
```

### Слишком много перезапусков

```bash
# Проверить логи
pm2 logs cooking-school

# Проверить наличие .env файла
ls -la .env
```

### Сбросить всё

```bash
pm2 delete all
pm2 kill
npm run pm2:start
```

---

Для подробной документации смотрите [PM2-GUIDE.md](./PM2-GUIDE.md)
