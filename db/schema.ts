import { pgEnum, pgTable, text, timestamp, uuid, real, index, boolean, jsonb, integer, customType } from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })

export const messageRole = pgEnum('message_role', ['user', 'assistant'])
export const contentType = pgEnum('content_type', ['text', 'voice'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(), email: text('email').notNull().unique(), passwordHash: text('password_hash').notNull(), displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), preferredAccent: text('preferred_accent').default('neutral').notNull(), themePreference: text('theme_preference').default('system').notNull(),
})
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'), profession: text('profession'), uses: jsonb('uses').$type<string[]>().default([]).notNull(), communicationStyle: text('communication_style'), experienceLevel: text('experience_level'), technologies: text('technologies'), goals: text('goals'), explicitMemory: text('explicit_memory'), memoryEnabled: boolean('memory_enabled').default(true).notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
export const memories = pgTable('memories', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), content: text('content').notNull(), source: text('source').notNull().default('explicit'), importance: real('importance').notNull().default(0.5), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ userUpdated: index('memories_user_updated_idx').on(t.userId, t.updatedAt) }))
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), title: text('title').notNull().default('New conversation'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ userUpdated: index('conversations_user_updated_idx').on(t.userId, t.updatedAt) }))
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(), conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }), role: messageRole('role').notNull(), contentText: text('content_text').notNull(), contentType: contentType('content_type').default('text').notNull(), audioUrl: text('audio_url'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ conversationCreated: index('messages_conversation_created_idx').on(t.conversationId, t.createdAt) }))
export const generatedFiles = pgTable('generated_files', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  name: text('name').notNull(), mimeType: text('mime_type').notNull(), size: integer('size').notNull(), data: bytea('data').notNull(), contentText: text('content_text'), metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ userCreated: index('generated_files_user_created_idx').on(t.userId, t.createdAt), conversationCreated: index('generated_files_conversation_created_idx').on(t.conversationId, t.createdAt) }))
export const voiceSettings = pgTable('voice_settings', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), accent: text('accent').notNull().default('neutral'), speed: real('speed').notNull().default(1), pitch: real('pitch').notNull().default(0), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), token: text('token').notNull().unique(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, t => ({ userExpires: index('sessions_user_expires_idx').on(t.userId, t.expiresAt) }))
