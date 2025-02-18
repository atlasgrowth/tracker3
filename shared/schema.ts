import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  name: text("name").notNull(),
  placeId: text("place_id").notNull(),
  region: text("region").notNull(),
  rating: integer("rating"),
  totalReviews: integer("total_reviews"),
  hasWebsite: boolean("has_website"),
  hasFacebook: boolean("has_facebook"),
  city: text("city"),
  pipelineStage: text("pipeline_stage").default("website_created"),
  lastViewed: timestamp("last_viewed"),
  totalViews: integer("total_views").default(0),
  notes: text("notes"),
  ownerName: text("owner_name"),
  introduction: text("introduction"),
  phone: text("phone"),
  reviewLink: text("review_link"),
  metadata: jsonb("metadata")
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  duration: integer("duration"), // in seconds
  source: text("source")
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({ 
  id: true,
  lastViewed: true,
  totalViews: true,
  pipelineStage: true
});

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type Visit = typeof visits.$inferSelect;

export const PIPELINE_STAGES = [
  "website_created",
  "website_sent",
  "website_viewed",
  "lead_contacted",
  "follow_up", 
  "not_interested"
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];
