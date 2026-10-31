import { Text } from "@/shared/ui/Typography";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { setupTheme } from "@/features/setup/setupTheme";

import {
  type ActiveLocation,
  type LocalityOption,
  type LocationPermissionState,
  METRO_MANILA_LOCALITIES,
} from "../model/location-schemas";

export type LocationSelectorModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  activeLocation: ActiveLocation;
  radiusKm: number | null;
  onSelectGps: () => Promise<void>;
  onSelectLocality: (locality: LocalityOption) => void;
  onSelectRadius: (radius: number | null) => void;
  onClearLocation: () => void;
  isLocating?: boolean;
  errorMessage?: string | null;
  permissionState?: LocationPermissionState;
}>;

const RADIUS_OPTIONS = [
  { label: "Any distance", value: null },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
] as const;

export function LocationSelectorModal({
  activeLocation,
  errorMessage = null,
  isLocating = false,
  onClearLocation,
  onClose,
  onSelectGps,
  onSelectLocality,
  onSelectRadius,
  permissionState = "undetermined",
  radiusKm,
  visible,
}: LocationSelectorModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalKicker}>NEARBY DISCOVERY</Text>
              <Text style={styles.modalTitle}>Location & Radius</Text>
            </View>
            <Pressable
              accessibilityLabel="Close location modal"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* GPS Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DEVICE LOCATION</Text>
              <Pressable
                accessibilityLabel="Use current device location"
                accessibilityRole="button"
                disabled={isLocating}
                onPress={() => {
                  void onSelectGps();
                }}
                style={[
                  styles.gpsButton,
                  activeLocation.source === "gps" && styles.gpsButtonActive,
                ]}
              >
                {isLocating ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={setupTheme.color.foreground} />
                    <Text style={styles.gpsButtonText}>
                      Acquiring GPS fix...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.gpsButtonText}>
                    {activeLocation.source === "gps"
                      ? "Update Device Location"
                      : "Use My Current Location"}
                  </Text>
                )}
              </Pressable>

              <Text style={styles.disclaimerText}>
                One-shot approximate GPS only. No background tracking. Exact
                address is never shared.
              </Text>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {permissionState === "services_disabled" ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    Device location is turned off. Select a Metro Manila hub
                    below.
                  </Text>
                </View>
              ) : null}

              {permissionState === "blocked" ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    Location permission is blocked. Select a Metro Manila hub
                    below.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Radius Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SEARCH RADIUS</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = radiusKm === opt.value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={String(opt.value)}
                      onPress={() => onSelectRadius(opt.value)}
                      style={[
                        styles.radiusPill,
                        isSelected && styles.radiusPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.radiusPillText,
                          isSelected && styles.radiusPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Localities Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>METRO MANILA LOCALITIES</Text>
              <Text style={styles.sectionSubtitle}>
                Select a hub to discover nearby work without GPS:
              </Text>

              <View style={styles.localityList}>
                {METRO_MANILA_LOCALITIES.map((loc) => {
                  const isSelected =
                    activeLocation.source === "locality" &&
                    activeLocation.label === loc.name;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={loc.id}
                      onPress={() => onSelectLocality(loc)}
                      style={[
                        styles.localityCard,
                        isSelected && styles.localityCardActive,
                      ]}
                    >
                      <View style={styles.localityInfo}>
                        <Text
                          style={[
                            styles.localityName,
                            isSelected && styles.localityNameActive,
                          ]}
                        >
                          {loc.name}
                        </Text>
                        <Text style={styles.localityRegion}>{loc.region}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.activeCheck}>
                          <Text style={styles.activeCheckText}>ACTIVE</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Clear Button */}
            {activeLocation.source !== "none" ? (
              <Pressable
                accessibilityLabel="Clear location filter"
                accessibilityRole="button"
                onPress={onClearLocation}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>
                  Reset to All Locations
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  activeCheck: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeCheckText: {
    color: setupTheme.color.ready,
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  clearButton: {
    alignItems: "center",
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.section,
  },
  clearButtonText: {
    color: setupTheme.color.muted,
    fontWeight: "600",
    fontSize: setupTheme.type.caption,
  },
  closeButton: {
    minHeight: setupTheme.size.touchTarget,
    justifyContent: "center",
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    paddingHorizontal: setupTheme.spacing.section,
    paddingVertical: setupTheme.spacing.compact,
  },
  closeButtonText: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: setupTheme.type.caption,
  },
  disclaimerText: {
    color: setupTheme.color.muted,
    fontWeight: "400",
    fontSize: 11,
    lineHeight: 16,
    marginTop: setupTheme.spacing.compact,
  },
  errorBox: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    marginTop: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  errorText: {
    color: setupTheme.color.danger,
    fontWeight: "500",
    fontSize: 12,
  },
  gpsButton: {
    minHeight: setupTheme.size.touchTarget,
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.section,
    ...setupTheme.shadow.card,
  },
  gpsButtonActive: {
    backgroundColor: setupTheme.color.readySurface,
    borderColor: setupTheme.color.ready,
  },
  gpsButtonText: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: setupTheme.type.body,
  },
  headerRow: {
    alignItems: "center",
    borderBottomColor: setupTheme.color.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: setupTheme.spacing.section,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  localityCard: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: setupTheme.spacing.section,
  },
  localityCardActive: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
  },
  localityInfo: {
    flex: 1,
  },
  localityList: {
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  localityName: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: setupTheme.type.body,
    marginBottom: 2,
  },
  localityNameActive: {
    color: setupTheme.color.foreground,
  },
  localityRegion: {
    color: setupTheme.color.muted,
    fontWeight: "400",
    fontSize: setupTheme.type.caption,
  },
  modalKicker: {
    color: setupTheme.color.muted,
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  modalTitle: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: setupTheme.type.heading,
  },
  noticeBox: {
    backgroundColor: setupTheme.color.warningSurface,
    borderColor: setupTheme.color.warning,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    marginTop: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  noticeText: {
    color: setupTheme.color.warning,
    fontWeight: "500",
    fontSize: 12,
  },
  overlay: {
    backgroundColor: setupTheme.color.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  radiusPill: {
    minHeight: setupTheme.size.touchTarget,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    flex: 1,
    paddingVertical: setupTheme.spacing.compact,
  },
  radiusPillActive: {
    backgroundColor: setupTheme.color.foreground,
    borderColor: setupTheme.color.foreground,
  },
  radiusPillText: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: setupTheme.type.caption,
  },
  radiusPillTextActive: {
    color: setupTheme.color.surface,
  },
  radiusRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  scrollContent: {
    paddingBottom: setupTheme.spacing.generous,
    paddingTop: setupTheme.spacing.section,
  },
  section: {
    marginBottom: setupTheme.spacing.content,
  },
  sectionSubtitle: {
    color: setupTheme.color.muted,
    fontWeight: "400",
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: setupTheme.color.foreground,
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  sheetContainer: {
    backgroundColor: setupTheme.color.background,
    borderTopLeftRadius: setupTheme.radius.card,
    borderTopRightRadius: setupTheme.radius.card,
    borderWidth: 2,
    borderColor: setupTheme.color.border,
    maxHeight: "85%",
    padding: setupTheme.spacing.section,
  },
});
