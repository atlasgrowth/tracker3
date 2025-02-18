import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBusinessSchema, PIPELINE_STAGES } from "@shared/schema";
import { z } from "zod";
import { join } from "path";
import { promises as fs } from "fs";
import express from "express";

const deviceInfoSchema = z.object({
  browser: z.string(),
  os: z.string(),
  screenSize: z.object({
    width: z.number(),
    height: z.number()
  })
});

const locationInfoSchema = z.object({
  country: z.string(),
  region: z.string()
});

const pageViewSchema = z.object({
  path: z.string(),
  timestamp: z.number(),
  timeSpent: z.number(),
  scrollDepth: z.number(),
  deviceInfo: deviceInfoSchema,
  location: locationInfoSchema
});

const clickEventSchema = z.object({
  path: z.string(),
  timestamp: z.number(),
  elementId: z.string(),
  elementText: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  })
});

const sessionSchema = z.object({
  siteId: z.string(),
  startTime: z.number(),
  lastActive: z.number(),
  deviceInfo: deviceInfoSchema,
  pageViews: z.array(pageViewSchema),
  clicks: z.array(clickEventSchema),
  navigationPath: z.array(z.string())
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Add CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Get all businesses
  app.get("/api/businesses", async (req, res) => {
    const businesses = await storage.getBusinesses();
    res.json(businesses);
  });

  // Get single business
  app.get("/api/businesses/:siteId", async (req, res) => {
    const business = await storage.getBusiness(req.params.siteId);
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business);
  });

  // Create business
  app.post("/api/businesses", async (req, res) => {
    const result = insertBusinessSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }
    const business = await storage.createBusiness(result.data);
    res.status(201).json(business);
  });

  // Update business stage
  app.patch("/api/businesses/:siteId/stage", async (req, res) => {
    const schema = z.object({ stage: z.enum(PIPELINE_STAGES) });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }

    try {
      const business = await storage.updateBusinessStage(
        req.params.siteId,
        result.data.stage
      );
      res.json(business);
    } catch (error) {
      res.status(404).json({ message: "Business not found" });
    }
  });

  // Update business notes
  app.patch("/api/businesses/:siteId/notes", async (req, res) => {
    const schema = z.object({ notes: z.string() });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }

    try {
      const business = await storage.updateBusinessNotes(
        req.params.siteId,
        result.data.notes
      );
      res.json(business);
    } catch (error) {
      res.status(404).json({ message: "Business not found" });
    }
  });

  // Get business visits (FIXED: use siteId: string)
  app.get("/api/businesses/:siteId/visits", async (req, res) => {
    try {
      const business = await storage.getBusiness(req.params.siteId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      // Updated line: pass siteId (string) to getVisits()
      const visits = await storage.getVisits(req.params.siteId);
      res.json(visits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  // Record visit
  app.post("/api/businesses/:siteId/visits", async (req, res) => {
    const schema = z.object({
      duration: z.number(),
      source: z.string()
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }

    try {
      const business = await storage.getBusiness(req.params.siteId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const visit = await storage.recordVisit(
        req.params.siteId,
        result.data.duration,
        result.data.source
      );
      res.status(201).json(visit);
    } catch (error) {
      console.error('Error recording visit:', error);
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // Record analytics
  app.post("/api/businesses/:siteId/analytics", async (req, res) => {
    try {
      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}] Received analytics from ${req.params.siteId}`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', JSON.stringify(req.headers, null, 2));
      const result = sessionSchema.safeParse(req.body);
      if (!result.success) {
        console.log('Validation errors:', result.error.errors);
        return res.status(400).json({ errors: result.error.errors });
      }

      const session = result.data;
      const siteId = req.params.siteId;

      // Ensure analytics directory exists
      const analyticsDir = join(process.cwd(), "analytics");
      await fs.mkdir(analyticsDir, { recursive: true });

      // Write session data to a file
      const filename = `analytics_${siteId}_${Date.now()}.json`;
      await fs.writeFile(
        join(analyticsDir, filename),
        JSON.stringify(session) + "\n"
      );

      res.status(201).json({ message: "Analytics recorded successfully" });
    } catch (error) {
      console.error("Error saving analytics:", error);
      res.status(500).json({ message: "Failed to save analytics" });
    }
  });

  // Get analytics
  app.get("/api/businesses/:siteId/analytics", async (req, res) => {
    try {
      const analyticsDir = join(process.cwd(), "analytics");
      const files = await fs.readdir(analyticsDir);
      const siteFiles = files.filter(f => f.startsWith(`analytics_${req.params.siteId}_`));
      
      const analytics = {
        pageViews: {},
        totalVisits: siteFiles.length,
        deviceStats: { browsers: {}, os: {} },
        visits: []
      };

      for (const file of siteFiles) {
        const data = JSON.parse(await fs.readFile(join(analyticsDir, file), 'utf-8'));
        
        // Aggregate page views
        data.pageViews.forEach(view => {
          analytics.pageViews[view.path] = (analytics.pageViews[view.path] || 0) + 1;
        });

        // Aggregate device stats
        const browser = data.deviceInfo.browser;
        const os = data.deviceInfo.os;
        analytics.deviceStats.browsers[browser] = (analytics.deviceStats.browsers[browser] || 0) + 1;
        analytics.deviceStats.os[os] = (analytics.deviceStats.os[os] || 0) + 1;
        
        // Add visit-specific data with session ID matching the visit
        analytics.visits.push({
          id: data.startTime, // Use startTime as ID to match with visits
          navigationPath: data.navigationPath,
          pageViews: data.pageViews
        });
      }

      res.json(analytics);
    } catch (error) {
      console.error("Error processing analytics:", error);
      res.status(500).json({ message: "Failed to process analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
