import { z } from "zod";

import {
  GIG_CATEGORIES,
  GIG_WORK_MODES,
} from "@/features/gigs/model/gig-schemas";

export const DISCOVERY_WORK_MODE_OPTIONS = ["all", ...GIG_WORK_MODES] as const;
export type DiscoveryWorkModeFilter =
  (typeof DISCOVERY_WORK_MODE_OPTIONS)[number];

export const DISCOVERY_CATEGORY_OPTIONS = ["all", ...GIG_CATEGORIES] as const;
export type DiscoveryCategoryFilter =
  (typeof DISCOVERY_CATEGORY_OPTIONS)[number];

export const DISCOVERY_DISTANCE_OPTIONS = [
  { label: "Any distance", value: null },
  { label: "Within 5 km", value: 5 },
  { label: "Within 10 km", value: 10 },
  { label: "Within 25 km", value: 25 },
] as const;

export const DiscoveryFiltersSchema = z.object({
  workMode: z.enum(DISCOVERY_WORK_MODE_OPTIONS).default("all"),
  category: z.enum(DISCOVERY_CATEGORY_OPTIONS).default("all"),
  maxDistanceKm: z.number().int().positive().nullable().default(null),
  searchQuery: z.string().trim().max(100).default(""),
});

export type DiscoveryFilters = z.infer<typeof DiscoveryFiltersSchema>;

export const DiscoveryGigCardSchema = z.object({
  id: z.string().uuid(),
  employerId: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum(GIG_CATEGORIES),
  workMode: z.enum(GIG_WORK_MODES),
  publicArea: z.string().trim().nullable(),
  publicLatitude: z.number().nullable(),
  publicLongitude: z.number().nullable(),
  budgetAmount: z.number().positive(),
  currency: z.string(),
  status: z.string(),
  distanceKm: z.number().nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  reasons: z.array(z.string()).default([]),
});

export type DiscoveryGigCard = z.infer<typeof DiscoveryGigCardSchema>;
