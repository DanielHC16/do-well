import { z } from "zod";

export const LocationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().nullable().default(null),
  timestamp: z.number().int().positive(),
});

export type LocationCoordinates = z.infer<typeof LocationCoordinatesSchema>;

export const LOCATION_PERMISSION_STATES = [
  "undetermined",
  "granted",
  "denied",
  "blocked",
  "services_disabled",
] as const;

export const LocationPermissionStateSchema = z.enum(LOCATION_PERMISSION_STATES);

export type LocationPermissionState = z.infer<
  typeof LocationPermissionStateSchema
>;

export const LocalityOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LocalityOption = z.infer<typeof LocalityOptionSchema>;

export const METRO_MANILA_LOCALITIES: readonly LocalityOption[] = [
  {
    id: "makati-cbd",
    name: "Makati CBD",
    region: "Makati, Metro Manila",
    latitude: 14.5547,
    longitude: 121.0244,
  },
  {
    id: "bgc-taguig",
    name: "Bonifacio Global City",
    region: "Taguig, Metro Manila",
    latitude: 14.5492,
    longitude: 121.0509,
  },
  {
    id: "ortigas-pasig",
    name: "Ortigas Center",
    region: "Pasig, Metro Manila",
    latitude: 14.5869,
    longitude: 121.0614,
  },
  {
    id: "cubao-qc",
    name: "Cubao",
    region: "Quezon City, Metro Manila",
    latitude: 14.6195,
    longitude: 121.0536,
  },
  {
    id: "diliman-qc",
    name: "Diliman / UP",
    region: "Quezon City, Metro Manila",
    latitude: 14.6538,
    longitude: 121.0685,
  },
  {
    id: "ermita-manila",
    name: "Ermita / Malate",
    region: "City of Manila",
    latitude: 14.5833,
    longitude: 120.9794,
  },
  {
    id: "mandaluyong",
    name: "Greenfield / Highway Hills",
    region: "Mandaluyong, Metro Manila",
    latitude: 14.5794,
    longitude: 121.0538,
  },
  {
    id: "pasay-moa",
    name: "Bay City / MOA",
    region: "Pasay, Metro Manila",
    latitude: 14.5353,
    longitude: 120.9829,
  },
  {
    id: "alabang",
    name: "Alabang / Filinvest",
    region: "Muntinlupa, Metro Manila",
    latitude: 14.4258,
    longitude: 121.0361,
  },
] as const;

export function findLocalityById(id: string): LocalityOption | undefined {
  return METRO_MANILA_LOCALITIES.find((loc) => loc.id === id);
}

export function getFallbackLocality(): LocalityOption {
  return METRO_MANILA_LOCALITIES[0];
}

export const ActiveLocationSchema = z.object({
  source: z.enum(["gps", "locality", "none"]),
  label: z.string(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  accuracy: z.number().positive().nullable(),
  timestamp: z.number().int().positive().nullable(),
});

export type ActiveLocation = z.infer<typeof ActiveLocationSchema>;
