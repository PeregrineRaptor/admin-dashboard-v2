# VPS Deployment Guide

Deploy Raptor CRM to a VPS (Ubuntu/Debian) with Nginx, PM2, and SSL.

## Prerequisites

- Ubuntu 20.04+ VPS
- Node.js 20+ installed
- Domain pointing to VPS IP (A record for adminv2.raptorscleaning.com)
- PostgreSQL database

## 1. Clone and Install

```bash
cd /var/www
git clone https://github.com/PeregrineRaptor/admin-dashboard-v2.git raptor-crm
cd raptor-crm
npm install
```

## 2. Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in all values in `.env` with your production credentials.

## 3. Database Setup

```bash
npm run db:push
npm run db:seed
```

## 4. Build

```bash
npm run build
```

## 5. PM2 Process Manager

```bash
npm install -g pm2
pm2 start npm --name "raptor-crm" -- start
pm2 save
pm2 startup
```

## 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/raptor-crm
```

Paste this config:

```nginx
server {
    listen 80;
    server_name adminv2.raptorscleaning.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/raptor-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d adminv2.raptorscleaning.com
```

## 8. Updating from GitHub

To pull and deploy updates:

```bash
cd /var/www/raptor-crm
git pull origin main
npm install
npm run build
pm2 restart raptor-crm
```
