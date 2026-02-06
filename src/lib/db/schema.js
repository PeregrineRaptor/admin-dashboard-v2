import { pgTable, serial, varchar, text, integer, decimal, boolean, timestamp, date, time, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  squareId: varchar('square_id', { length: 50 }).unique(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).notNull().default('service_provider'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),
  payType: varchar('pay_type', { length: 20 }).default('hourly'), // hourly or commission
  payRate: decimal('pay_rate', { precision: 10, scale: 2 }), // hourly rate in $ or commission as percentage (e.g., 40.00 = 40%)
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const crews = pgTable('crews', {
  id: serial('id').primaryKey(),
  squareId: varchar('square_id', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#3B82F6'),
  maxDailyProduction: decimal('max_daily_production', { precision: 10, scale: 2 }).default('2000.00'),
  workingDays: jsonb('working_days').default([1, 2, 3, 4, 5]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const crewMembers = pgTable('crew_members', {
  id: serial('id').primaryKey(),
  crewId: integer('crew_id').references(() => crews.id),
  userId: integer('user_id').references(() => users.id),
  isLead: boolean('is_lead').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }),
  parentId: integer('parent_id').references(() => cities.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true),
});

export const crewCitySchedules = pgTable('crew_city_schedules', {
  id: serial('id').primaryKey(),
  crewId: integer('crew_id').references(() => crews.id),
  cityId: integer('city_id').references(() => cities.id),
  dayOfWeek: integer('day_of_week').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  pricingType: varchar('pricing_type', { length: 20 }).default('flat_rate'), // flat_rate, hourly, or tiered
  basePrice: decimal('base_price', { precision: 10, scale: 2 }), // flat rate price or base hourly rate
  firstHourRate: decimal('first_hour_rate', { precision: 10, scale: 2 }), // for tiered: first hour price (e.g., housekeeping $130)
  additionalHourRate: decimal('additional_hour_rate', { precision: 10, scale: 2 }), // for tiered: each additional hour (e.g., $75)
  durationMinutes: integer('duration_minutes').default(45),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const crewServices = pgTable('crew_services', {
  id: serial('id').primaryKey(),
  crewId: integer('crew_id').references(() => crews.id),
  serviceId: integer('service_id').references(() => services.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  squareCustomerId: varchar('square_customer_id', { length: 50 }),
  referenceId: varchar('reference_id', { length: 50 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  companyName: varchar('company_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  nickname: varchar('nickname', { length: 100 }),
  streetAddress1: varchar('street_address_1', { length: 255 }),
  streetAddress2: varchar('street_address_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('Canada'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  birthday: date('birthday'),
  memo: text('memo'),
  windowsPrice: decimal('windows_price', { precision: 10, scale: 2 }),
  eavesPrice: decimal('eaves_price', { precision: 10, scale: 2 }),
  hasSeasonPass: boolean('has_season_pass').default(false),
  seasonPassYear: integer('season_pass_year'),
  seasonPassPurchaseDate: date('season_pass_purchase_date'),
  seasonPassExpiryDate: date('season_pass_expiry_date'),
  seasonPassPrice: decimal('season_pass_price', { precision: 10, scale: 2 }),
  isBlockedFromOnlineBooking: boolean('is_blocked_from_online_booking').default(false),
  emailSubscriptionStatus: varchar('email_subscription_status', { length: 50 }),
  firstVisit: date('first_visit'),
  lastVisit: date('last_visit'),
  transactionCount: integer('transaction_count').default(0),
  lifetimeSpend: decimal('lifetime_spend', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customerPricing = pgTable('customer_pricing', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  serviceId: integer('service_id').references(() => services.id),
  customPrice: decimal('custom_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customerProperties = pgTable('customer_properties', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  name: varchar('name', { length: 100 }).default('Property #01'),
  streetAddress1: varchar('street_address_1', { length: 255 }),
  streetAddress2: varchar('street_address_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('Canada'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  isBillingAddress: boolean('is_billing_address').default(false),
  isServiceAddress: boolean('is_service_address').default(true),
  windowsPrice: decimal('windows_price', { precision: 10, scale: 2 }),
  eavesPrice: decimal('eaves_price', { precision: 10, scale: 2 }),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const propertyServicePricing = pgTable('property_service_pricing', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').references(() => customerProperties.id).notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  customPrice: decimal('custom_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  squareAppointmentId: varchar('square_appointment_id', { length: 50 }),
  customerId: integer('customer_id').references(() => customers.id),
  propertyId: integer('property_id').references(() => customerProperties.id),
  crewId: integer('crew_id').references(() => crews.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  scheduledDate: date('scheduled_date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  isAllDay: boolean('is_all_day').default(true),
  routeOrder: integer('route_order'),
  address: text('address'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  discountType: varchar('discount_type', { length: 50 }), // 'season_pass', 'promo', 'manual'
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  discountNote: text('discount_note'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  isPaid: boolean('is_paid').default(false),
  noteFromClient: text('note_from_client'),
  noteFromBusiness: text('note_from_business'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bookingServices = pgTable('booking_services', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  serviceId: integer('service_id').references(() => services.id),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  variation: varchar('variation', { length: 100 }),
});

export const bookingStaff = pgTable('booking_staff', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  userId: integer('user_id').references(() => users.id),
  xpEarned: integer('xp_earned').default(0),
  amountEarned: decimal('amount_earned', { precision: 10, scale: 2 }),
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  customerId: integer('customer_id').references(() => customers.id),
  rating: integer('rating'),
  comment: text('comment'),
  staffRatings: jsonb('staff_ratings'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const staffStats = pgTable('staff_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  totalJobs: integer('total_jobs').default(0),
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).default('0'),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count').default(0),
  perfectJobStreak: integer('perfect_job_streak').default(0),
  bestStreak: integer('best_streak').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  xpReward: integer('xp_reward').default(0),
  criteria: jsonb('criteria'),
});

export const staffAchievements = pgTable('staff_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  achievementId: integer('achievement_id').references(() => achievements.id),
  earnedAt: timestamp('earned_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  channelId: varchar('channel_id', { length: 100 }).notNull(),
  senderId: integer('sender_id').references(() => users.id),
  content: text('content').notNull(),
  attachmentUrl: text('attachment_url'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatChannels = pgTable('chat_channels', {
  id: serial('id').primaryKey(),
  channelId: varchar('channel_id', { length: 100 }).unique().notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  crewId: integer('crew_id').references(() => crews.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatChannelMembers = pgTable('chat_channel_members', {
  id: serial('id').primaryKey(),
  channelId: varchar('channel_id', { length: 100 }).notNull(),
  userId: integer('user_id').references(() => users.id),
  lastRead: timestamp('last_read'),
});

export const emailCampaigns = pgTable('email_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  content: text('content'),
  segmentCriteria: jsonb('segment_criteria'),
  status: varchar('status', { length: 50 }).default('draft'),
  sentAt: timestamp('sent_at'),
  recipientCount: integer('recipient_count').default(0),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const emailRecipients = pgTable('email_recipients', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => emailCampaigns.id),
  customerId: integer('customer_id').references(() => customers.id),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  status: varchar('status', { length: 50 }).default('pending'),
  validUntil: date('valid_until'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const quoteServices = pgTable('quote_services', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id').references(() => quotes.id),
  serviceId: integer('service_id').references(() => services.id),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  data: jsonb('data'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: integer('entity_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  brief: text('brief'),
  status: varchar('status', { length: 50 }).default('draft'),
  filters: jsonb('filters').default([]),
  selectedCustomerIds: jsonb('selected_customer_ids').default([]),
  sendEmail: boolean('send_email').default(true),
  emailSendDate: timestamp('email_send_date'),
  emailSendTime: varchar('email_send_time', { length: 10 }),
  emailSubject: varchar('email_subject', { length: 255 }),
  emailBody: text('email_body'),
  sendCall: boolean('send_call').default(true),
  followUpDelayDays: integer('follow_up_delay_days').default(3),
  callSendDate: timestamp('call_send_date'),
  callSendTime: varchar('call_send_time', { length: 10 }),
  callScript: text('call_script'),
  callRetryCount: integer('call_retry_count').default(2),
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  openedCount: integer('opened_count').default(0),
  respondedCount: integer('responded_count').default(0),
  calledCount: integer('called_count').default(0),
  bookedCount: integer('booked_count').default(0),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  sentAt: timestamp('sent_at'),
});

export const campaignCustomers = pgTable('campaign_customers', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  status: varchar('status', { length: 50 }).default('pending'),
  emailSentAt: timestamp('email_sent_at'),
  emailOpenedAt: timestamp('email_opened_at'),
  emailRespondedAt: timestamp('email_responded_at'),
  followUpSentAt: timestamp('follow_up_sent_at'),
  callScheduledAt: timestamp('call_scheduled_at'),
  callCompletedAt: timestamp('call_completed_at'),
  callOutcome: varchar('call_outcome', { length: 100 }),
  bookingId: integer('booking_id').references(() => bookings.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
