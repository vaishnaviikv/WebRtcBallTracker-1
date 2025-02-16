import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  password: text('password').notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Types for WebRTC/WebTransport communication
export const BallCoordinates = z.object({
  x: z.number(),
  y: z.number(),
  timestamp: z.number()
});

export const ErrorMetrics = z.object({
  error: z.number(),
  timestamp: z.number()
});

export type BallCoordinatesType = z.infer<typeof BallCoordinates>;
export type ErrorMetricsType = z.infer<typeof ErrorMetrics>;

// Config type for ball animation
export const BallConfig = z.object({
  frameRate: z.number().min(1).max(60).default(30),
  width: z.number().default(640),
  height: z.number().default(480),
  ballRadius: z.number().default(20)
});

export type BallConfigType = z.infer<typeof BallConfig>;