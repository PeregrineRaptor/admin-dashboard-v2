# Raptor CRM

Customer Relationship Management system for Raptor The Luxury Brand cleaning service.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies: `npm install`
4. Push database schema: `npm run db:push`
5. Seed initial data: `npm run db:seed`

## Development

```bash
npm run dev
```

Runs on `http://localhost:5000`

## Production Build

```bash
npm run build
npm start
```

## VPS Deployment

See `DEPLOY.md` for full deployment instructions to a VPS with Nginx and PM2.
