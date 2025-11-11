# 🔧 Troubleshooting Guide

Common issues and solutions for production deployment.

## Authentication Issues

### Problem: "Logged in successfully" but immediately redirected back to login

This is usually a session/cookie issue. Common causes:

#### 1. FRONTEND_URL Mismatch

**Symptom:** Login works but session not maintained.

**Solution:**
```bash
# In .env file, ensure FRONTEND_URL matches your actual domain
# ❌ Wrong:
FRONTEND_URL=http://localhost:3001

# ✅ Correct for production:
FRONTEND_URL=https://yourdomain.com
```

After changing .env:
```bash
pm2 restart cooking-school
```

#### 2. Missing Nginx Proxy Headers

**Symptom:** Sessions work in development but not behind Nginx.

**Solution:** Ensure your Nginx configuration includes proxy headers:

```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;

    # Required headers for sessions
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

#### 3. Cookie Domain Issues

**Symptom:** Cookies not being set in browser.

**Check browser DevTools:**
1. Open DevTools → Application/Storage → Cookies
2. Check if `connect.sid` cookie exists
3. Verify domain and path are correct

**If cookie domain is wrong**, update .env:
```bash
# Ensure NODE_ENV is set correctly
NODE_ENV=production
```

#### 4. HTTPS Required but Not Configured

**Symptom:** Session cookie not being set in production.

**Cause:** When `NODE_ENV=production`, cookies require HTTPS (`secure: true`).

**Solution:** Ensure SSL is properly configured:
```bash
# Check SSL certificate
sudo certbot certificates

# If expired or missing, renew/obtain:
sudo certbot renew
```

## Database Issues

### Problem: "Error opening database"

**Solution:**
```bash
# Check database path exists
ls -la /var/www/cooking-school/*.db

# Check permissions
sudo chown -R www-data:www-data /var/www/cooking-school
# Or for your user:
sudo chown -R $USER:$USER /var/www/cooking-school

# Check DATABASE_PATH in .env
cat .env | grep DATABASE_PATH
```

### Problem: Database locked

**Symptom:** "Database is locked" error.

**Solution:**
```bash
# Check if multiple processes are accessing DB
lsof /var/www/cooking-school/cooking_school.db

# Restart PM2 to clear locks
pm2 restart cooking-school
```

## Stripe Issues

### Problem: "Stripe.js not loading"

**Solution:**
1. Check browser console for CORS errors
2. Verify STRIPE_PUBLISHABLE_KEY in .env
3. Ensure /config endpoint is accessible:
```bash
curl https://yourdomain.com/config
```

### Problem: Webhook errors

**Symptom:** Payments succeed but bookings not confirmed.

**Solution:**
```bash
# Check webhook secret is set
cat .env | grep STRIPE_WEBHOOK_SECRET

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check PM2 logs for webhook events
pm2 logs cooking-school --lines 100 | grep webhook
```

## CORS Issues

### Problem: "Access-Control-Allow-Origin" errors

**Symptom:** Browser console shows CORS errors.

**Solution:**

1. **Check FRONTEND_URL in .env:**
```bash
cat .env | grep FRONTEND_URL
# Should match your domain exactly
```

2. **For multiple domains**, update server.js:
```javascript
app.use(cors({
    origin: [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
    ],
    credentials: true
}));
```

3. **Restart after changes:**
```bash
pm2 restart cooking-school
```

## PM2 Issues

### Problem: App not starting with PM2

**Check logs:**
```bash
pm2 logs cooking-school --lines 50

# Check error log specifically
pm2 logs cooking-school --err --lines 50
```

**Common fixes:**
```bash
# Delete and restart
pm2 delete cooking-school
npm run pm2:start

# Clear PM2 cache
pm2 flush
pm2 restart cooking-school
```

### Problem: App crashes on startup

**Check environment variables:**
```bash
# View PM2 environment
pm2 show cooking-school

# Ensure .env file exists
ls -la /var/www/cooking-school/.env

# Check .env is readable
cat /var/www/cooking-school/.env
```

## Nginx Issues

### Problem: 502 Bad Gateway

**Causes:**
1. Node.js app not running
2. Wrong port in Nginx config
3. Firewall blocking internal communication

**Solutions:**
```bash
# Check app is running
pm2 status
curl http://localhost:3001/

# Check Nginx config
sudo nginx -t

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart both
pm2 restart cooking-school
sudo systemctl restart nginx
```

### Problem: 504 Gateway Timeout

**Solution:** Increase timeout in Nginx config:
```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_read_timeout 120s;
    proxy_connect_timeout 120s;
}
```

## SSL Certificate Issues

### Problem: "Your connection is not private"

**Solutions:**
```bash
# Check certificate status
sudo certbot certificates

# Renew if expired
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Problem: Mixed content warnings

**Symptom:** Page loads but some resources fail.

**Cause:** Mixing HTTP and HTTPS.

**Solution:** Ensure all URLs in .env use HTTPS:
```bash
FRONTEND_URL=https://yourdomain.com  # Not http://
```

## Performance Issues

### Problem: Slow response times

**Check PM2 metrics:**
```bash
pm2 monit

# Check memory usage
pm2 list
```

**Solutions:**
```bash
# Increase PM2 instances (cluster mode)
pm2 scale cooking-school 2

# Or restart
pm2 restart cooking-school
```

### Problem: High memory usage

**Solution:**
```bash
# Set memory limit in ecosystem.config.js
max_memory_restart: '500M'

# Reload config
pm2 reload ecosystem.config.js
```

## Quick Diagnostic Commands

```bash
# Check everything at once
echo "=== PM2 Status ===" && pm2 status
echo "=== Nginx Status ===" && sudo systemctl status nginx
echo "=== SSL Certificates ===" && sudo certbot certificates
echo "=== Disk Space ===" && df -h
echo "=== Recent Logs ===" && pm2 logs cooking-school --lines 20 --nostream

# Check environment
echo "=== Environment Variables ==="
cat .env | grep -v "SECRET\|KEY" | grep -v "PASSWORD"

# Test endpoints
echo "=== Testing Endpoints ==="
curl -I http://localhost:3001/
curl -I https://yourdomain.com/config
```

## Getting Help

If you're still having issues:

1. **Collect diagnostic information:**
```bash
# Save logs
pm2 logs cooking-school --lines 200 > pm2-logs.txt
sudo tail -200 /var/log/nginx/error.log > nginx-logs.txt

# Save configuration (sanitize secrets first!)
cat .env | grep -v "SECRET\|KEY" | grep -v "PASSWORD" > env-config.txt
sudo cat /etc/nginx/sites-available/cooking-school > nginx-config.txt
```

2. **Check browser console** (F12) for JavaScript errors

3. **Check network tab** in DevTools for failed requests

4. **Review PM2 logs** for server-side errors

## Common Error Messages

### "Session save error"
- Check disk space: `df -h`
- Check file permissions on session store

### "Invalid credentials"
- Verify ADMIN_PASSWORD_HASH is set correctly
- Password should be "admin123" by default

### "Failed to create session"
- Check disk space
- Verify SESSION_SECRET is set in .env

### "Configuration not loaded"
- Check /config endpoint is accessible
- Verify API_BASE_URL and STRIPE_PUBLISHABLE_KEY are set

---

Still need help? Create an issue with:
- Error message
- PM2 logs
- Nginx logs (if applicable)
- Browser console errors
- Your sanitized configuration
