# Raptor The Luxury Brand - CRM System

## Overview
This project is a comprehensive Customer Relationship Management (CRM) system designed for Raptor The Luxury Brand, a high-end cleaning service company. The primary purpose of this CRM is to streamline operations, enhance customer satisfaction, and improve staff efficiency. Key capabilities include multi-crew scheduling, AI-powered features for optimized booking and recommendations, gamified staff management for motivation, and a customer self-service portal. The business vision is to provide a robust, scalable platform that supports Raptor's growth, differentiates its service offering through technology, and ultimately expands its market presence in the luxury cleaning sector.

## User Preferences
- Single address entry with Google Places autocomplete
- Embedded Google Maps for customer profiles and bookings
- Configurable max daily production limits per crew
- Customers can have multiple properties with individual pricing per property
- Hierarchical city structure: sub-cities belong to parent cities for crew route optimization (e.g., Ancaster is in Hamilton, Aldershot is in Burlington)

## System Architecture
The system is built on a modern web stack using Next.js 14 with the App Router for its frontend and API routes, React 18 for UI components, and PostgreSQL as the primary database managed by Drizzle ORM. Authentication is handled via NextAuth.js, and state management utilizes Redux Toolkit. Material UI (MUI) is used for a consistent and responsive design system, aiming for a clean, intuitive, and professional UI/UX, incorporating a dark mode toggle for user preference.

Core architectural decisions include:
- **Data Model:** A rich PostgreSQL schema supports complex relationships including users (staff with roles), customers with multi-property support and custom pricing, bookings, crews with city-based schedules, services, and gamification elements like staff statistics and achievements.
- **API Design:** RESTful API endpoints are provided for all major entities (customers, bookings, crews, services, staff, etc.), with robust authentication and authorization checks. Special endpoints exist for Square API integration and AI functionalities.
- **Scheduling and Booking:** Features multi-crew scheduling with configurable daily production limits. An AI-powered scheduling assistant leverages OpenAI to provide optimal booking date recommendations based on crew availability and city schedules. Bookings can be linked to specific customer properties and support various service pricing models (flat rate, hourly, tiered).
- **Gamification:** Staff management includes gamified elements like XP, levels, achievements, and a leaderboard to foster engagement and performance.
- **Customer Management:** Comprehensive customer profiles include contact information, multiple properties, custom service pricing per property, booking history, and buyer summaries.
- **External Integrations:** Seamless integration with Square for customer and booking data synchronization, and OpenAI for AI-driven features. Google Geocoding API is used for address validation and city management.
- **Modular Development:** The project structure emphasizes modularity with clear separation of concerns (pages, components, libraries, styles, API routes).

## External Dependencies
- **PostgreSQL:** Primary relational database.
- **Drizzle ORM:** Object-Relational Mapper for database interaction.
- **NextAuth.js:** Authentication library.
- **Material UI (MUI):** UI component library.
- **OpenAI API:** For AI-powered booking recommendations and other intelligent features.
- **Square API:** For syncing customer data, bookings, staff, and managing appointments.
- **Google Geocoding API:** For address validation and city data management.
- **bcryptjs:** For password hashing.
- **csv-parse:** Library for CSV parsing during data import.
- **Aircall API:** For phone call tracking and AI-powered call summaries with business context categorization.

## Season Pass Feature
The Season Pass is a customer loyalty program:
- **Price:** $150 one-time purchase
- **Benefit:** 25% discount on all services for one full year
- **Validity:** Active for 12 months from purchase date (tracked via expiry date)
- **Customer Profile:** Shows Season Pass status with purchase/expiry dates and amount paid
- **Booking Integration:** Season Pass discount is automatically applied to bookings when customer has an active pass
- **Alternative Discounts:** Promo discounts can also be applied to bookings with custom amounts and notes

## Booking Discounts
Bookings support three discount types:
- `season_pass` - 25% automatic discount for Season Pass holders
- `promo` - Custom promotional discount with configurable amount and note
- `null` - No discount applied
Discounts are tracked with discountType, discountAmount, and discountNote fields on bookings.

## Route Optimization Feature
The Optimization page helps managers plan efficient crew routes:
- **Three-Tab Interface:** Separates "Over Capacity" (crews exceeding max), "Ready to Optimize" (90%+ utilization), and "All Days" views
- **Over-Capacity Warnings:** Red-highlighted cards show crews over their daily max with "Over by $X" badges
- **Crew Reassignment Suggestions:** Over-capacity days display available crews with remaining capacity as colored chips with tooltips
- **Jump to Date:** Single date picker lets you view any specific day's crew schedules
- **Estimated Time Calculations:** Each booking shows estimated job duration based on $200/hour production rate
- **Crew Capacity View:** Shows upcoming days where crews are at or near max production (90%+ utilization)
- **Utilization Tracking:** Progress bars display production totals vs. configurable max daily limits
- **Map View:** Google Maps Static API displays all properties for a crew/day with numbered markers
- **Route Optimization:** Uses nearest-neighbor algorithm with Haversine distance to calculate optimal route order
- **Status Filtering:** Only includes active bookings (pending, confirmed, scheduled, accepted) in calculations
- **Route Order:** Each booking has a `routeOrder` field that determines the sequence for the day
- **Date Validation:** Both client and server validate date ranges; inverted dates are automatically swapped

## Geocoding
- Properties are automatically geocoded when created or updated via the Google Geocoding API
- The GOOGLE_MAPS_API_KEY secret is used for server-side geocoding operations
- All customer properties have latitude/longitude coordinates for map display and route optimization

## Marketing Automation
The Marketing page enables targeted customer outreach campaigns:
- **Campaign Management:** Create, view, and manage marketing campaigns with status tracking (draft, active, sent, completed)
- **Customer Search:** Search and select specific customers by name, email, or phone for targeted campaigns
- **Quick Filter Presets:** One-click targeting for common segments:
  - All Customers (with email)
  - Win-Back (booked last year, not this year)
  - Inactive (no booking in 6+ months)
  - New Customers (added in last 30 days)
  - VIP Customers ($2000+ lifetime spend)
- **Visual Filter Builder:** Target customers using multiple criteria:
  - `city` - Filter by customer city (is/is not)
  - `lifetimeSpend` - Based on total spending (greater than/less than)
  - `lastBookingDate` - Before/after specific date or never booked
  - `hasSeasonPass` - Season Pass holder status
- **Audience Preview:** See matching customer count and sample results before creating campaigns
- **Campaign Brief & AI Content Generation:**
  - Enter a campaign brief describing the goal (e.g., "Win back customers who haven't booked in 6 months with a spring discount")
  - Click "Generate with AI" to auto-create email subject, email body, and call script
  - AI-generated content uses personalization shortcodes: `{{first_name}}`, `{{last_name}}`, `{{city}}`, `{{company_name}}`, `{{last_booking_date}}`
- **Campaign Sequence Flow:**
  - Step 1: Email - Configure send date, time (24-hour with 15-minute intervals), subject, and body
  - Step 2: AI Follow-up Call - Triggers X days after email if no response (1-7 day delay configurable via slider), or set specific call date/time if email is disabled
  - Call retry attempts configurable (0-5 retries if no answer)
- **Campaign Summary:** Shows clear preview of what will happen (e.g., "Email 5 customers on Feb 10 at 10:00 AM. AI calls 3 days later if no response.")
- **Database Schema:** `campaigns` table stores brief, filter criteria, selectedCustomerIds as JSONB, emailSendTime, followUpDelayDays, callSendDate, callSendTime, callRetryCount fields; `campaign_customers` tracks individual recipient status
- **Metrics Tracking:** Total recipients, sent/opened/responded/booked counts per campaign