import {
  ActiveLocationSchema,
  findLocalityById,
  getFallbackLocality,
  LocalityOptionSchema,
  LocationCoordinatesSchema,
  LocationPermissionStateSchema,
  METRO_MANILA_LOCALITIES,
} from "../location-schemas";

describe("location-schemas", () => {
  describe("LocationCoordinatesSchema", () => {
    it("validates valid coordinate records", () => {
      const valid = {
        latitude: 14.5547,
        longitude: 121.0244,
        accuracy: 12.5,
        timestamp: 1729864800000,
      };
      const parsed = LocationCoordinatesSchema.parse(valid);
      expect(parsed.latitude).toBe(14.5547);
      expect(parsed.longitude).toBe(121.0244);
      expect(parsed.accuracy).toBe(12.5);
    });

    it("accepts null accuracy and defaults to null", () => {
      const parsed = LocationCoordinatesSchema.parse({
        latitude: 14.5,
        longitude: 121.0,
        timestamp: 1729864800000,
      });
      expect(parsed.accuracy).toBeNull();
    });

    it("rejects invalid latitude bounds (< -90 or > 90)", () => {
      expect(() =>
        LocationCoordinatesSchema.parse({
          latitude: 91.5,
          longitude: 121.0,
          timestamp: 1729864800000,
        }),
      ).toThrow();
    });

    it("rejects invalid longitude bounds (< -180 or > 180)", () => {
      expect(() =>
        LocationCoordinatesSchema.parse({
          latitude: 14.5,
          longitude: 181.0,
          timestamp: 1729864800000,
        }),
      ).toThrow();
    });
  });

  describe("LocationPermissionStateSchema", () => {
    it("accepts all valid permission states", () => {
      const states = [
        "undetermined",
        "granted",
        "denied",
        "blocked",
        "services_disabled",
      ];
      for (const state of states) {
        expect(LocationPermissionStateSchema.parse(state)).toBe(state);
      }
    });

    it("rejects unknown permission state", () => {
      expect(() =>
        LocationPermissionStateSchema.parse("unrestricted"),
      ).toThrow();
    });
  });

  describe("METRO_MANILA_LOCALITIES & helpers", () => {
    it("has valid localities matching schema", () => {
      expect(METRO_MANILA_LOCALITIES.length).toBeGreaterThanOrEqual(5);
      for (const loc of METRO_MANILA_LOCALITIES) {
        expect(() => LocalityOptionSchema.parse(loc)).not.toThrow();
      }
    });

    it("finds a locality by id", () => {
      const makati = findLocalityById("makati-cbd");
      expect(makati).toBeDefined();
      expect(makati?.name).toBe("Makati CBD");
      expect(makati?.latitude).toBeCloseTo(14.5547);
    });

    it("returns undefined for unknown locality id", () => {
      expect(findLocalityById("unknown-zone")).toBeUndefined();
    });

    it("returns Makati CBD as fallback", () => {
      const fallback = getFallbackLocality();
      expect(fallback.id).toBe("makati-cbd");
    });
  });

  describe("ActiveLocationSchema", () => {
    it("validates GPS active location", () => {
      const active = {
        source: "gps" as const,
        label: "Current location (~15m)",
        latitude: 14.5547,
        longitude: 121.0244,
        accuracy: 15,
        timestamp: 1729864800000,
      };
      expect(() => ActiveLocationSchema.parse(active)).not.toThrow();
    });

    it("validates Locality active location", () => {
      const active = {
        source: "locality" as const,
        label: "Bonifacio Global City",
        latitude: 14.5492,
        longitude: 121.0509,
        accuracy: null,
        timestamp: null,
      };
      expect(() => ActiveLocationSchema.parse(active)).not.toThrow();
    });

    it("validates None active location", () => {
      const active = {
        source: "none" as const,
        label: "Location not set",
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null,
      };
      expect(() => ActiveLocationSchema.parse(active)).not.toThrow();
    });
  });
});
