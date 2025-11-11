# 🚀 Quick Production Deployment Guide

Быстрая инструкция для деплоя на сервер.

## Предварительные требования

- ✅ VPS/сервер с Ubuntu 20.04+ или Debian 10+
- ✅ Доменное имя направлено на IP сервера
- ✅ Root или sudo доступ
- ✅ Порты 80, 443, 22 открыты

## 1. Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установить PM2 и Nginx
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx

# Проверить установку
node -v
npm -v
pm2 -v
nginx -v
```

## 2. Загрузка кода

```bash
# Перейти в рабочую директорию
cd /var/www

# Клонировать репозиторий (или загрузить файлы)
sudo git clone your-repo.git cooking-school
cd cooking-school

# Установить зависимости
npm install --production
```

## 3. Настройка переменных окружения

```bash
# Создать .env файл
sudo nano .env
```

Добавить:
```env
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...  # Скопировать из .env.example
SESSION_SECRET=your-long-random-secret-key
```

```bash
# Установить права доступа
sudo chmod 600 .env
```

## 4. Запуск PM2

```bash
# Запустить в production режиме
npm run pm2:start

# Или
./pm2.sh production

# Проверить статус
pm2 status

# Настроить автозапуск
pm2 startup
pm2 save
```

## 5. Настройка Nginx

```bash
# Скопировать конфигурацию
sudo cp nginx.conf.example /etc/nginx/sites-available/cooking-school

# Отредактировать домен
sudo nano /etc/nginx/sites-available/cooking-school
# Заменить yourdomain.com на ваш домен

# Активировать
sudo ln -s /etc/nginx/sites-available/cooking-school /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Удалить default конфиг

# Проверить
sudo nginx -t
```

## 6. Получить SSL сертификат

```bash
# Временно отключить SSL в Nginx конфигурации
# или использовать certbot standalone

# Остановить Nginx
sudo systemctl stop nginx

# Получить сертификат
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Запустить Nginx
sudo systemctl start nginx

# Проверить автообновление
sudo certbot renew --dry-run
```

## 7. Финальная проверка

```bash
# Перезапустить всё
sudo systemctl restart nginx
pm2 restart cooking-school

# Проверить статусы
sudo systemctl status nginx
pm2 status

# Проверить логи
pm2 logs cooking-school --lines 50
sudo tail -f /var/log/nginx/cooking-school-error.log

# Открыть в браузере
curl -I https://yourdomain.com
```

## 8. Настройка firewall

```bash
# UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Обновление приложения

```bash
cd /var/www/cooking-school

# Получить новый код
git pull origin main

# Установить зависимости (если есть новые)
npm install --production

# Перезапустить PM2
pm2 restart cooking-school

# Или с помощью npm
npm run pm2:restart
```

## Мониторинг

```bash
# Просмотр логов PM2
pm2 logs cooking-school

# Просмотр логов Nginx
sudo tail -f /var/log/nginx/cooking-school-access.log
sudo tail -f /var/log/nginx/cooking-school-error.log

# Статус процессов
pm2 status
pm2 monit

# Использование ресурсов
htop
```

## Backup

```bash
# Создать скрипт backup
sudo nano /root/backup-cooking-school.sh
```

Содержимое:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/root/backups"

mkdir -p $BACKUP_DIR

# Backup базы данных
cp /var/www/cooking-school/*.db $BACKUP_DIR/db-$DATE.db

# Backup .env
cp /var/www/cooking-school/.env $BACKUP_DIR/env-$DATE

# Backup Nginx config
cp /etc/nginx/sites-available/cooking-school $BACKUP_DIR/nginx-$DATE.conf

# Удалить старые backup (старше 30 дней)
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Сделать исполняемым
sudo chmod +x /root/backup-cooking-school.sh

# Добавить в cron (ежедневно в 3 утра)
sudo crontab -e

# Добавить строку:
0 3 * * * /root/backup-cooking-school.sh >> /var/log/backup.log 2>&1
```

## Troubleshooting

### 502 Bad Gateway
```bash
# Проверить PM2
pm2 status
pm2 logs cooking-school

# Проверить порт
sudo netstat -tulpn | grep :3001
```

### 504 Gateway Timeout
```bash
# Увеличить таймауты в Nginx
sudo nano /etc/nginx/sites-available/cooking-school
# Добавить в location /:
# proxy_read_timeout 120s;
```

### SSL не работает
```bash
# Проверить сертификаты
sudo certbot certificates

# Обновить вручную
sudo certbot renew

# Проверить пути в Nginx
sudo nginx -t
```

## Полезные ссылки

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Stripe Production Checklist](https://stripe.com/docs/production-checklist)

---

**Время деплоя:** ~20-30 минут
**Сложность:** Средняя

После завершения откройте https://yourdomain.com в браузере! 🎉
