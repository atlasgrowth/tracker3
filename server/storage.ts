import { Business, Visit, InsertBusiness, PIPELINE_STAGES } from "@shared/schema";
import { promises as fs } from 'fs';
import { join } from 'path';

export interface IStorage {
  // Business operations
  getBusinesses(): Promise<Business[]>;
  getBusiness(siteId: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusinessStage(siteId: string, stage: string): Promise<Business>;
  updateBusinessNotes(siteId: string, notes: string): Promise<Business>;

  // Visit operations
  recordVisit(siteId: string, duration: number, source: string): Promise<Visit>;

  // CHANGED this to use siteId: string
  getVisits(siteId: string): Promise<Visit[]>;
}

interface MetadataBusinesses {
  last_updated: string;
  business_count: number;
  businesses: {
    [key: string]: {
      name: string;
      site_id: string;
      place_id: string;
      rating: number;
      total_reviews: number;
      scores: {
        photo_score: number;
        facebook_score: number;
      };
      has_website: boolean;
      has_facebook: boolean;
      city: string;
    };
  };
}

export class MemStorage implements IStorage {
  private businesses: Map<string, Business>;
  private visits: Map<number, Visit[]>;
  private currentId: number;
  private visitId: number;

  constructor() {
    this.businesses = new Map();
    this.visits = new Map();
    this.currentId = 1;
    this.visitId = 1;

    // Load initial data from metadata file
    this.initialize().catch(error => {
      console.error('Failed to initialize businesses:', error);
      process.exit(1); // Exit if we can't load the businesses
    });
  }

  private async loadMetadataFromFile(url: string): Promise<MetadataBusinesses> {
    try {
      console.log('Fetching metadata from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Parsed businesses count:', Object.keys(data.businesses || {}).length);

      if (!data || typeof data !== 'object' || !data.businesses) {
        throw new Error('Invalid metadata structure - missing businesses object');
      }

      return data as MetadataBusinesses;
    } catch (error) {
      console.error('Error loading metadata:', error);
      throw error;
    }
  }

  private async initialize() {
    try {
      const regions = [
        {
          id: 'arkansas',
          name: 'Arkansas',
          url: 'https://raw.githubusercontent.com/atlasgrowth/Arkansasplumbers/main/data/processed/metadata.json'
        },
        {
          id: 'alabama',
          name: 'Alabama',
          url: 'https://raw.githubusercontent.com/atlasgrowth/alabamaplumbersnowebsite/main/data/metadata.json'
        }
      ];

      for (const region of regions) {
        console.log(`Fetching metadata for ${region.name} from: ${region.url}`);
        const metadata = await this.loadMetadataFromFile(region.url);
        const businessesData = metadata.businesses;

        console.log(`Initializing businesses for ${region.name}, found:`, Object.keys(businessesData).length);

        // Load all businesses from the metadata
        Object.entries(businessesData).forEach(([siteId, business]) => {
          const id = this.currentId++;
          const newBusiness: Business = {
            id,
            siteId,
            name: business.name,
            placeId: business.place_id || '',
            rating: business.rating ?? null,
            totalReviews: business.total_reviews ?? null,
            hasWebsite: business.has_website ?? false,
            hasFacebook: business.has_facebook ?? false,
            city: business.city ?? null,
            pipelineStage: "website_created",
            lastViewed: null,
            totalViews: 0,
            notes: null,
            ownerName: business.owner_name || null,
            introduction: business.introduction || null,
            phone: business.phone || null,
            reviewLink: business.review_link || null,
            region: region.id,
            metadata: {}
          };
          this.businesses.set(siteId, newBusiness);
        });

        console.log(`Successfully loaded ${this.businesses.size} businesses from ${region.name} GitHub metadata`);
      }
    } catch (error) {
      console.error('Error initializing businesses:', error);
      throw error;
    }
  }

  async getBusinesses(): Promise<Business[]> {
    return Array.from(this.businesses.values());
  }

  async getBusiness(siteId: string): Promise<Business | undefined> {
    return this.businesses.get(siteId);
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentId++;
    const business: Business = {
      ...insertBusiness,
      id,
      pipelineStage: "website_created",
      lastViewed: null,
      totalViews: 0,
      notes: null,
      metadata: {}
    };
    this.businesses.set(business.siteId, business);
    return business;
  }

  async updateBusinessStage(siteId: string, stage: string): Promise<Business> {
    const business = await this.getBusiness(siteId);
    if (!business) throw new Error("Business not found");

    // Update stage
    business.pipelineStage = stage;
    this.businesses.set(siteId, business);

    console.log(`Updated pipeline stage for ${business.name} to ${stage}`);
    return business;
  }

  async updateBusinessNotes(siteId: string, notes: string): Promise<Business> {
    const business = await this.getBusiness(siteId);
    if (!business) throw new Error("Business not found");

    business.notes = notes;
    this.businesses.set(siteId, business);
    return business;
  }

  async recordVisit(siteId: string, duration: number, source: string): Promise<Visit> {
    const business = await this.getBusiness(siteId);
    if (!business) throw new Error("Business not found");

    // Only record visits that have a duration
    if (duration === 0) {
      return {
        id: 0,
        siteId,
        timestamp: new Date(),
        duration,
        source
      };
    }

    const visit: Visit = {
      id: this.visitId++,
      siteId,
      timestamp: new Date(),
      duration,
      source
    };

    const businessVisits = this.visits.get(business.id) || [];
    businessVisits.push(visit);
    this.visits.set(business.id, businessVisits);

    // Update business visit stats and pipeline stage
    business.lastViewed = visit.timestamp;
    business.totalViews = (business.totalViews || 0) + 1;

    // Update pipeline stage to website_viewed if it's in an earlier stage
    console.log(`Current pipeline stage for ${business.name}: ${business.pipelineStage}`);
    if (business.pipelineStage === "website_created" || business.pipelineStage === "website_sent") {
      business.pipelineStage = "website_viewed";
      console.log(`Updated pipeline stage to website_viewed for business ${business.name}`);
    } else {
      console.log(`No stage update needed for ${business.name} (current stage: ${business.pipelineStage})`);
    }

    this.businesses.set(business.siteId, business);

    console.log(`Recorded visit for business ${siteId}, duration: ${duration}s, source: ${source}`);
    return visit;
  }

  // CHANGED the parameter to siteId: string, so it matches the IStorage interface
  async getVisits(siteId: string): Promise<Visit[]> {
    const business = await this.getBusiness(siteId);
    if (!business) return [];
    return this.visits.get(business.id) || [];
  }
}

export const storage = new MemStorage();