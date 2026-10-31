import { Text } from "@/shared/ui/Typography";
import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import {
  AppButton,
  AppText,
  BrandLogo,
  ScreenContainer,
  setupTheme,
} from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";

const steps = [
  {
    title: "Discover flexible paid gigs",
    body: "Explore opportunities around Makati and Metro Manila, or find remote work from anywhere. Choose an area yourself or enable nearby discovery when you need it.",
  },
  {
    title: "Find help for short-term tasks",
    body: "Post a clear brief, set compensation in pesos, and choose an applicant yourself. One account lets you find work and offer work.",
  },
  {
    title: "Manage work efficiently",
    body: "Agree on the work, follow milestones, and share updates and evidence. Track progress from application to employer-approved completion.",
  },
];

const illustrations = [
  {
    icon: "search",
    title: "Work, on your terms",
    caption: "Nearby & remote",
    firstIcon: "pin",
    firstLabel: "Your area",
    secondIcon: "remote",
    secondLabel: "Anywhere",
    description: "nearby and remote opportunity cards",
  },
  {
    icon: "file",
    title: "Start with a clear brief",
    caption: "A little clarity goes a long way",
    firstIcon: "layers",
    firstLabel: "The task",
    secondIcon: "clock",
    secondLabel: "The plan",
    description: "a task brief connected to scope and schedule cards",
  },
  {
    icon: "briefcase",
    title: "One step at a time",
    caption: "Stay on the same page",
    firstIcon: "check",
    firstLabel: "Agree",
    secondIcon: "layers",
    secondLabel: "Track & review",
    description: "connected agreement and milestone cards",
  },
] as const;

function WorkIllustration({ step }: Readonly<{ step: number }>) {
  const artwork = illustrations[step];
  const { fontScale } = useWindowDimensions();
  const adaptiveCard = { flexBasis: 100 * fontScale };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Illustration: ${artwork.description}.`}
      style={styles.artwork}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.artworkContents}
      >
        <View style={styles.artworkEyebrow}>
          <View style={styles.artworkDot} />
          <Text style={styles.artworkCaption}>{artwork.caption}</Text>
        </View>
        <View style={styles.taskCard}>
          <View style={styles.taskHeading}>
            <View style={styles.taskIcon}>
              <AppIcon
                name={artwork.icon}
                size={24}
                color={setupTheme.color.onPrimary}
              />
            </View>
            <Text style={styles.taskTitle}>{artwork.title}</Text>
          </View>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.shortLine]} />
          <View style={styles.taskFooter}>
            <View style={styles.mintMark} />
            <View style={[styles.skeletonLine, styles.footerLine]} />
          </View>
        </View>
        <View style={styles.connector} />
        <View style={styles.connectedCards}>
          <View style={[styles.smallCard, adaptiveCard]}>
            <AppIcon
              name={artwork.firstIcon}
              size={22}
              color={setupTheme.color.primary}
            />
            <Text style={styles.smallCardLabel}>{artwork.firstLabel}</Text>
          </View>
          <View style={[styles.smallCard, styles.smallCardMint, adaptiveCard]}>
            <AppIcon
              name={artwork.secondIcon}
              size={22}
              color={setupTheme.color.primary}
            />
            <Text style={styles.smallCardLabel}>{artwork.secondLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function WelcomeWalkthrough({
  onFinish,
}: Readonly<{ onFinish: () => void }>) {
  const [step, setStep] = useState(0);
  const content = steps[step];
  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <BrandLogo size={48} />
          <AppText variant="heading">Do Well</AppText>
          <View style={styles.stepPill}>
            <AppText tone="muted" variant="caption">
              {step + 1} / {steps.length}
            </AppText>
          </View>
        </View>
        <WorkIllustration step={step} />
        <AppText accessibilityRole="header" variant="heading">
          {content.title}
        </AppText>
        <AppText tone="muted">{content.body}</AppText>
        <View
          style={styles.dots}
          accessibilityLabel={`Introduction step ${step + 1} of ${steps.length}`}
        >
          {steps.map((item, index) => (
            <View
              key={item.title}
              style={[styles.dot, index === step && styles.selectedDot]}
            />
          ))}
        </View>
        <AppButton
          label={step === steps.length - 1 ? "Get started" : "Continue"}
          icon="arrowRight"
          onPress={() =>
            step === steps.length - 1
              ? onFinish()
              : setStep((value) => value + 1)
          }
        />
        <AppButton
          label="Skip introduction"
          variant="secondary"
          onPress={onFinish}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: setupTheme.spacing.section,
  },
  brandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  stepPill: {
    marginLeft: "auto",
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.status,
  },
  artwork: {
    borderRadius: setupTheme.radius.card,
    backgroundColor: setupTheme.color.accentSurface,
    padding: setupTheme.spacing.section,
    overflow: "hidden",
  },
  artworkContents: { gap: setupTheme.spacing.compact },
  artworkEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  artworkDot: {
    backgroundColor: setupTheme.color.primary,
    width: setupTheme.spacing.compact,
    height: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.status,
  },
  artworkCaption: {
    flex: 1,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
  },
  taskCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderRadius: setupTheme.radius.control,
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.compact,
  },
  taskHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  taskIcon: {
    backgroundColor: setupTheme.color.primary,
    minWidth: setupTheme.size.touchTarget,
    minHeight: setupTheme.size.touchTarget,
    padding: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: {
    flex: 1,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
    lineHeight: 24,
  },
  skeletonLine: {
    height: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.surfaceMuted,
    width: "100%",
    borderRadius: setupTheme.radius.status,
  },
  shortLine: { width: "65%" },
  taskFooter: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    alignItems: "center",
  },
  mintMark: {
    backgroundColor: setupTheme.color.mint,
    width: setupTheme.spacing.section,
    height: setupTheme.spacing.section,
    borderRadius: setupTheme.radius.status,
  },
  footerLine: { width: "35%" },
  connector: {
    width: 1,
    height: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.secondary,
    alignSelf: "center",
  },
  connectedCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  smallCard: {
    flex: 1,
    flexBasis: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.surface,
    padding: setupTheme.spacing.compact,
  },
  smallCardMint: { backgroundColor: setupTheme.color.mint },
  smallCardLabel: {
    flex: 1,
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
    fontWeight: "600",
  },
  dots: { flexDirection: "row", gap: setupTheme.spacing.compact },
  dot: {
    width: setupTheme.spacing.compact,
    height: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.status,
    backgroundColor: setupTheme.color.borderSoft,
  },
  selectedDot: { backgroundColor: setupTheme.color.primary },
});
