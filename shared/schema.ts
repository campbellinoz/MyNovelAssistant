import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// Updated to support both Replit Auth and Google OAuth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // OAuth provider fields
  googleId: varchar("google_id").unique(), // Google OAuth ID
  
  // Usage tracking  
  maxMonthlyQueries: integer("max_monthly_queries").default(10), // Based on subscription tier
  
  // Subscription fields
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free', 'basic', 'pro', 'premium'
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active', 'cancelled', 'expired'
  paypalSubscriptionId: varchar("paypal_subscription_id"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  
  // Usage tracking for cost control
  monthlyAiQueries: integer("monthly_ai_queries").default(0),
  monthlyAudioCharacters: integer("monthly_audio_characters").default(0), // Characters converted to audio
  monthlyTranslationCharacters: integer("monthly_translation_characters").default(0), // Characters translated
  monthlyResetDate: timestamp("monthly_reset_date").defaultNow(),
  
  // Usage limits by tier
  audioCharacterLimit: integer("audio_character_limit").default(0), // Monthly limit for audio generation
  translationCharacterLimit: integer("translation_character_limit").default(0), // Monthly limit for translation
  
  // Overage charges (pay-per-use beyond limits)
  currentMonthOverageCharges: integer("current_month_overage_charges").default(0), // In cents
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  timePeriod: text("time_period"), // e.g., "1971", "1840s", "Medieval", "Victorian Era"
  setting: text("setting"), // e.g., "London", "Rural Ireland", "New York", "Paris"
  genre: text("genre"), // e.g., "Historical Fiction", "Drama", "Romance"
  wordCount: integer("word_count").default(0),
  targetWordCount: integer("target_word_count"),
  
  // James Scott Bell's LOCK System
  lead: text("lead"), // Lead character (protagonist)
  objective: text("objective"), // What the lead wants
  confrontation: text("confrontation"), // Main conflict/opposition
  knockout: text("knockout"), // The ending/resolution
  
  // Bell's Story Structure Elements
  disturbance: text("disturbance"), // Inciting incident that disrupts normal life
  doorway: text("doorway"), // Point of no return
  mirrorMoment: text("mirror_moment"), // Character's self-realization moment
  darkMoment: text("dark_moment"), // Lowest point before final push
  midpointTwist: text("midpoint_twist"), // Major complication at story center
  
  // Death Stakes (Bell's concept of what's at risk)
  physicalStakes: text("physical_stakes"), // Physical death or harm
  professionalStakes: text("professional_stakes"), // Career/reputation death
  psychologicalStakes: text("psychological_stakes"), // Identity/self-worth death
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_projects_user_id").on(table.userId),
]);

export const chapters = pgTable("chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").default(""),
  wordCount: integer("word_count").default(0),
  order: integer("order").notNull(),
  
  // Chapter type and section management
  chapterType: varchar("chapter_type").notNull().default("chapter"), // 'copyright', 'epigraph', 'table_of_contents', 'about_author', 'chapter', 'dedication', 'preface'
  section: varchar("section").notNull().default("body"), // 'front_matter', 'body', 'back_matter'
  isSystemGenerated: boolean("is_system_generated").default(false), // For auto-generated sections like TOC
  
  // Plot Planning Fields
  synopsis: text("synopsis"), // Brief chapter summary
  plotPoints: jsonb("plot_points").default([]), // Array of key plot points
  storyBeats: text("story_beats"), // Inciting incident, rising action, etc.
  conflicts: text("conflicts"), // Tensions introduced/resolved
  characterArcs: text("character_arcs"), // Character development notes
  povCharacter: text("pov_character"), // Point of view character
  chapterPurpose: text("chapter_purpose"), // Function in overall story
  themes: text("themes"), // Themes explored
  foreshadowing: text("foreshadowing"), // Hints about future events
  sceneCount: integer("scene_count").default(1), // Number of scenes
  setting: text("setting"), // Location/setting for this chapter
  
  // James Scott Bell Structure Elements
  bellSequenceType: text("bell_sequence_type"), // Action, Reaction, or Setup sequence
  containsMirrorMoment: integer("contains_mirror_moment").default(0), // 1 if this chapter has the mirror moment
  chapterStakes: text("chapter_stakes"), // What's at risk in this specific chapter
  conflictLevel: text("conflict_level"), // Low, Medium, High tension
  reactionBeat: text("reaction_beat"), // Character's emotional reaction to previous events
  nextActionHook: text("next_action_hook"), // What propels story forward to next chapter
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_chapters_project_id").on(table.projectId),
]);

export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  traits: jsonb("traits").default({}),
  
  // Storyboard and Development Fields
  characterArc: text("character_arc"), // Overall character journey
  developmentStages: jsonb("development_stages").default([]), // Array of development milestones
  relationships: jsonb("relationships").default({}), // Relationships with other characters
  motivations: text("motivations"), // Core motivations and goals
  conflicts: text("conflicts"), // Internal and external conflicts
  backstory: text("backstory"), // Character history and background
  
  // Visual Storyboard Elements
  appearance: text("appearance"), // Physical description
  storyboardNotes: jsonb("storyboard_notes").default([]), // Visual story progression notes
  keyScenes: jsonb("key_scenes").default([]), // Important scenes for this character
  emotionalJourney: jsonb("emotional_journey").default([]), // Emotional progression
  
  // Character Development Tracking
  introductionChapter: varchar("introduction_chapter"), // Chapter where character is introduced
  majorDevelopmentPoints: jsonb("major_development_points").default([]), // Key development moments
  characterTheme: text("character_theme"), // Central theme for this character
  symbolism: text("symbolism"), // Symbolic representation
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_characters_project_id").on(table.projectId),
]);

// Character Development Timeline entries
export const characterDevelopmentTimeline = pgTable("character_development_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  chapterId: varchar("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  timelinePosition: integer("timeline_position").notNull(), // Order in the timeline
  eventType: text("event_type").notNull(), // "introduction", "development", "conflict", "resolution", "transformation"
  title: text("title").notNull(),
  description: text("description"),
  emotionalState: text("emotional_state"), // Character's emotional state at this point
  relationshipChanges: jsonb("relationship_changes").default({}), // Changes in relationships
  visualNotes: text("visual_notes"), // Notes for visual representation
  storyboardImage: text("storyboard_image"), // Optional image description/prompt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Character Relationships mapping
export const characterRelationships = pgTable("character_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  characterAId: varchar("character_a_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  characterBId: varchar("character_b_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(), // "family", "romantic", "friendship", "rivalry", "mentor", "antagonist"
  description: text("description"),
  dynamicProgression: jsonb("dynamic_progression").default([]), // How relationship evolves
  conflictPoints: jsonb("conflict_points").default([]), // Points of tension
  bondingMoments: jsonb("bonding_moments").default([]), // Positive interaction moments
  currentStatus: text("current_status"), // Current state of relationship
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  chapterId: varchar("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'plot', 'character', 'dialogue', 'description'
  title: text("title").notNull(),
  content: text("content").notNull(),
  applied: integer("applied").default(0), // 0 = pending, 1 = applied, -1 = dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  chapterId: varchar("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const historicalResearchMessages = pgTable("historical_research_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  topic: text("topic"), // research topic category
  timeEra: text("time_era"),
  setting: text("setting"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  wordCount: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  wordCount: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAISuggestionSchema = createInsertSchema(aiSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertAIChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertHistoricalResearchMessageSchema = createInsertSchema(historicalResearchMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCharacterDevelopmentTimelineSchema = createInsertSchema(characterDevelopmentTimeline).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Chapter type definitions
export const CHAPTER_TYPES = {
  // Front matter
  copyright: 'Copyright',
  dedication: 'Dedication', 
  epigraph: 'Epigraph',
  table_of_contents: 'Table of Contents',
  preface: 'Preface',
  
  // Body
  chapter: 'Chapter',
  
  // Back matter
  about_author: 'About the Author',
  appendix: 'Appendix',
  bibliography: 'Bibliography',
} as const;

export const CHAPTER_SECTIONS = {
  front_matter: 'Front pages',
  body: 'Story chapters', 
  back_matter: 'Back pages',
} as const;

export type ChapterType = keyof typeof CHAPTER_TYPES;
export type ChapterSection = keyof typeof CHAPTER_SECTIONS;

export const insertCharacterRelationshipSchema = createInsertSchema(characterRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// Update schemas
export const updateProjectSchema = insertProjectSchema.partial();
export const updateChapterSchema = insertChapterSchema.partial();
export const updateCharacterSchema = insertCharacterSchema.partial();
export const updateCharacterDevelopmentTimelineSchema = insertCharacterDevelopmentTimelineSchema.partial();
export const updateCharacterRelationshipSchema = insertCharacterRelationshipSchema.partial();

export const upsertUserSchema = insertUserSchema;

// Types
export type User = typeof users.$inferSelect;

// Support ticket system
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: varchar("subject").notNull(),
  message: varchar("message", { length: 5000 }).notNull(),
  status: varchar("status").notNull().default("open"), // open, in_progress, resolved, closed
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, urgent
  category: varchar("category").notNull().default("general"), // general, technical, billing, feature_request
  adminResponse: varchar("admin_response", { length: 5000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => supportTickets.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  isAdmin: boolean("is_admin").notNull().default(false),
  message: varchar("message", { length: 5000 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const audiobooks = pgTable("audiobooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(), // Chapter or book content to convert to audio
  voice: varchar("voice").notNull(), // Google TTS voice IDs like 'en-US-Neural2-A', 'en-GB-Standard-B'
  quality: varchar("quality").default("standard"), // 'standard', 'wavenet', 'neural2', 'studio'
  language: varchar("language").default("en"), // Language code for TTS
  scope: varchar("scope").default("fullbook"), // 'chapter' or 'fullbook'
  selectedChapterId: varchar("selected_chapter_id").references(() => chapters.id),
  status: varchar("status").default("pending"), // 'pending', 'generating', 'completed', 'failed'
  totalChapters: integer("total_chapters").default(0),
  completedChapters: integer("completed_chapters").default(0),
  filePath: text("file_path"), // Path to final combined audiobook file
  chapterFiles: jsonb("chapter_files").default([]), // Array of individual chapter file paths
  duration: integer("duration"), // Total duration in seconds
  fileSize: integer("file_size"), // File size in bytes
  characterCount: integer("character_count"), // Number of characters processed
  estimatedCost: integer("estimated_cost"), // Cost in cents
  actualCost: integer("actual_cost"), // Final cost in cents
  wasOverageCharge: boolean("was_overage_charge").default(false), // True if exceeded monthly limit
  error: text("error"), // Error message if generation failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Copyright Management
export const copyrightInfo = pgTable("copyright_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  penName: varchar("pen_name"),
  address: text("address"),
  yearOfPublication: integer("year_of_publication").default(new Date().getFullYear()),
  epubIsbn: varchar("epub_isbn"),
  paperbackIsbn: varchar("paperback_isbn"),
  pdfIsbn: varchar("pdf_isbn"),
  publisherName: varchar("publisher_name"),
  publisherLogo: varchar("publisher_logo"),
  collaborators: jsonb("collaborators").default([]),
  includeAllRightsReserved: boolean("include_all_rights_reserved").default(false),
  includeBasicNotice: boolean("include_basic_notice").default(false),
  includeExtendedNotice: boolean("include_extended_notice").default(false),
  includeRegistrationNotice: boolean("include_registration_notice").default(false),
  customCopyrightText: text("custom_copyright_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage tracking table for detailed monitoring and billing
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  serviceType: varchar("service_type").notNull(), // 'audiobook', 'translation', 'ai_query'
  resourceId: varchar("resource_id"), // ID of audiobook, translation, etc.
  characterCount: integer("character_count").default(0),
  costCents: integer("cost_cents").default(0),
  wasOverage: boolean("was_overage").default(false),
  billingMonth: varchar("billing_month").notNull(), // YYYY-MM format
  createdAt: timestamp("created_at").defaultNow(),
});

// Translation table for new translation feature
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  sourceLanguage: varchar("source_language").notNull().default("en"),
  targetLanguage: varchar("target_language").notNull(),
  scope: varchar("scope").notNull(), // 'chapter' or 'fullbook'
  selectedChapterId: varchar("selected_chapter_id").references(() => chapters.id),
  status: varchar("status").default("pending"), // 'pending', 'translating', 'completed', 'failed'
  progress: integer("progress").default(0),
  originalCharacterCount: integer("original_character_count"),
  translatedContent: text("translated_content"),
  estimatedCost: integer("estimated_cost"), // Cost in cents
  actualCost: integer("actual_cost"),
  wasOverageCharge: boolean("was_overage_charge").default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = typeof supportTicketMessages.$inferInsert;
export const insertAudiobookSchema = createInsertSchema(audiobooks).omit({
  id: true,
  content: true, // Content is fetched by server, not provided by client
  createdAt: true,
  updatedAt: true,
});

export type Audiobook = typeof audiobooks.$inferSelect;
export type InsertAudiobook = typeof audiobooks.$inferInsert;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

export type CopyrightInfo = typeof copyrightInfo.$inferSelect;
export type InsertCopyrightInfo = typeof copyrightInfo.$inferInsert;

export const insertCopyrightInfoSchema = createInsertSchema(copyrightInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCopyrightInfoSchema = insertCopyrightInfoSchema.partial();

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  createdAt: true,
});

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type UpdateChapter = z.infer<typeof updateChapterSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type UpdateCharacter = z.infer<typeof updateCharacterSchema>;

export type AISuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAISuggestion = z.infer<typeof insertAISuggestionSchema>;

export type AIChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;

export type HistoricalResearchMessage = typeof historicalResearchMessages.$inferSelect;
export type InsertHistoricalResearchMessage = z.infer<typeof insertHistoricalResearchMessageSchema>;

export type CharacterDevelopmentTimeline = typeof characterDevelopmentTimeline.$inferSelect;
export type InsertCharacterDevelopmentTimeline = z.infer<typeof insertCharacterDevelopmentTimelineSchema>;
export type UpdateCharacterDevelopmentTimeline = z.infer<typeof updateCharacterDevelopmentTimelineSchema>;

export type CharacterRelationship = typeof characterRelationships.$inferSelect;
export type InsertCharacterRelationship = z.infer<typeof insertCharacterRelationshipSchema>;
export type UpdateCharacterRelationship = z.infer<typeof updateCharacterRelationshipSchema>;

// Enhanced chapter management types
export interface ChapterReorderRequest {
  chapterId: string;
  newOrder: number;
  newSection?: ChapterSection;
}
