# Nginx Setup Guide для Production

## Установка Nginx

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install nginx
```

### CentOS/RHEL

```bash
sudo yum install nginx
```

### Проверка установки

```bash
nginx -v
sudo systemctl status nginx
```

## Настройка Nginx для Cooking School

### 1. Копирование конфигурации

```bash
# Скопировать пример конфигурации
sudo cp nginx.conf.example /etc/nginx/sites-available/cooking-school

# Отредактировать конфигурацию
sudo nano /etc/nginx/sites-available/cooking-school
```

### 2. Изменить параметры

Замените следующие значения в файле конфигурации:

- `yourdomain.com` → ваш реальный домен
- Пути к SSL сертификатам (если они уже есть)
- Порт PM2 (по умолчанию 3001)

### 3. Создать симлинк

```bash
# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/cooking-school /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (опционально)
sudo rm /etc/nginx/sites-enabled/default
```

### 4. Проверить конфигурацию

```bash
sudo nginx -t
```

Вы должны увидеть:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Перезапустить Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx  # Автозапуск при старте системы
```

## SSL Сертификаты (Let's Encrypt)

### Установка Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### Получение сертификата

```bash
# Остановить Nginx временно
sudo systemctl stop nginx

# Получить сертификат
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Или с Nginx (если он уже запущен)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Автоматическое обновление сертификата

```bash
# Проверить автообновление
sudo certbot renew --dry-run

# Добавить в cron (опционально)
sudo crontab -e

# Добавить строку:
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## Проверка работы

### 1. Проверить доступность

```bash
curl -I http://yourdomain.com
curl -I https://yourdomain.com
```

### 2. Проверить редирект HTTP → HTTPS

```bash
curl -L http://yourdomain.com
```

### 3. Проверить SSL

```bash
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 4. Онлайн тесты

- SSL Labs: https://www.ssllabs.com/ssltest/
- Security Headers: https://securityheaders.com/

## Мониторинг логов

### Просмотр логов в реальном времени

```bash
# Access logs
sudo tail -f /var/log/nginx/cooking-school-access.log

# Error logs
sudo tail -f /var/log/nginx/cooking-school-error.log

# Оба лога
sudo tail -f /var/log/nginx/cooking-school-*.log
```

### Анализ логов

```bash
# Топ IP адресов
sudo awk '{print $1}' /var/log/nginx/cooking-school-access.log | sort | uniq -c | sort -rn | head -20

# Топ User Agents
sudo awk -F'"' '{print $6}' /var/log/nginx/cooking-school-access.log | sort | uniq -c | sort -rn | head -10

# Ошибки 404
sudo grep " 404 " /var/log/nginx/cooking-school-access.log | tail -20
```

## Оптимизация производительности

### 1. Настроить worker processes

```bash
sudo nano /etc/nginx/nginx.conf
```

Добавить/изменить:

```nginx
# Количество worker processes = количество CPU ядер
worker_processes auto;

# Максимум соединений на worker
events {
    worker_connections 2048;
    use epoll;  # Только для Linux
    multi_accept on;
}
```

### 2. Настроить буферы

```nginx
http {
    # ... другие настройки ...

    # Client body buffer
    client_body_buffer_size 128k;

    # Headers buffer
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
}
```

### 3. Включить кэширование

```nginx
http {
    # ... другие настройки ...

    # Кэш для proxy
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;
}
```

## Firewall настройки

### UFW (Ubuntu)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

### Firewalld (CentOS)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Troubleshooting

### Nginx не запускается

```bash
# Проверить синтаксис конфигурации
sudo nginx -t

# Проверить логи ошибок
sudo tail -f /var/log/nginx/error.log

# Проверить, не занят ли порт
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### 502 Bad Gateway

Проверьте:

1. PM2 процесс запущен:
```bash
pm2 status
```

2. PM2 слушает на порту 3001:
```bash
sudo netstat -tulpn | grep :3001
```

3. SELinux настройки (CentOS):
```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 504 Gateway Timeout

Увеличьте таймауты в Nginx конфигурации:

```nginx
location / {
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
    proxy_read_timeout 90s;
}
```

### Слишком много 429 ошибок (Rate Limit)

Настройте rate limiting зоны в конфигурации:

```nginx
# Увеличить лимиты
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;  # было 10r/s
```

## Backup конфигурации

```bash
# Создать backup
sudo cp /etc/nginx/sites-available/cooking-school /etc/nginx/sites-available/cooking-school.backup.$(date +%Y%m%d)

# Или весь nginx
sudo tar -czf nginx-config-backup-$(date +%Y%m%d).tar.gz /etc/nginx/
```

## Полезные команды

```bash
# Проверить конфигурацию
sudo nginx -t

# Перезагрузить конфигурацию (без downtime)
sudo nginx -s reload
# или
sudo systemctl reload nginx

# Перезапустить Nginx
sudo systemctl restart nginx

# Остановить Nginx
sudo systemctl stop nginx

# Запустить Nginx
sudo systemctl start nginx

# Статус Nginx
sudo systemctl status nginx

# Просмотр активных соединений
curl http://localhost/nginx_status  # требует настройки stub_status
```

## Security Best Practices

1. ✅ Всегда используйте HTTPS
2. ✅ Обновляйте SSL сертификаты автоматически
3. ✅ Настройте rate limiting
4. ✅ Включите security headers
5. ✅ Регулярно обновляйте Nginx
6. ✅ Мониторьте логи на подозрительную активность
7. ✅ Блокируйте доступ к служебным файлам (.env, .git)
8. ✅ Используйте сильные SSL ciphers
9. ✅ Настройте firewall

## Мониторинг производительности

### Nginx Status Module

Добавьте в конфигурацию:

```nginx
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}
```

Проверка:
```bash
curl http://localhost/nginx_status
```

## Дополнительные ресурсы

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [SSL Labs Testing](https://www.ssllabs.com/ssltest/)
- [Security Headers Check](https://securityheaders.com/)
- [Nginx Config Generator](https://nginxconfig.io/)
