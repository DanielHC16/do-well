# Do Well frontend assets

The owner-provided `Do Well App LOGO.svg` is the current in-app identity. The original SVG is unchanged. It contains two embedded PNG images and SVG masks/filters; the Android image decoder rendered this combination blank during emulator inspection. `branding/do-well-app-logo.png` is a faithful transparent 512 × 512 browser-rendered rendition of that exact SVG, produced locally with Microsoft Edge headless. It is displayed on a white circular surface so the source's transparent letterforms remain legible, without recoloring or stretching the artwork. No third-party or AI-generated logo is used. The legacy `Do Well LOGO.png` and existing native launcher/splash configuration are retained; this refinement changes in-app branding only.

## Interface symbols

- Renderer: existing `expo-symbols` 58.0.4, MIT; [official documentation](https://docs.expo.dev/versions/latest/sdk/symbols/) and [source](https://github.com/expo/expo/tree/main/packages/expo-symbols).
- Android/web glyphs: Google Material Symbols, regular weight, already supplied by `@expo-google-fonts/material-symbols` 0.4.50 through the installed Expo Symbols package. [Material Symbols source and licensing](https://github.com/google/material-design-icons) / [Google Fonts catalog](https://fonts.google.com/icons). The font is Apache-2.0 licensed; the Expo packaging is MIT. Copies of the font license and renderer license are under `branding/licenses/`.
- `src/shared/ui/AppIcon.tsx` maps semantic interface concepts to Android/web Material Symbols and iOS SF Symbols. Android names are specified explicitly; an iOS-only symbol string would render nothing on Android. Glyphs are decorative and hidden from accessibility because adjacent text or the containing control supplies the accessible label.
- Use the existing regular weight only. Additional weights would introduce extra font files. No new package, font download, remote asset request, API, billing, or native configuration is required.
- Icons reinforce navigation, password visibility, search, location, categories, compensation, and work status. They never replace essential text or imply verified identities, guaranteed safety, ratings, or payment capabilities.

## Original illustration and typography

The onboarding task-card composition is original React Native layout code using neutral skeleton lines and interface symbols. It is decorative illustration, not fabricated marketplace data. It uses no raster files, stock photography, SVG library, network requests, or animation loop. The existing logo remains separate and unmodified.

The compact empty-state paper/search, briefcase, plus, and activity compositions are also original React Native views using the same licensed symbols. No stock illustration, remote imagery, or additional animation dependency is used. Shared buttons retain lightweight native press feedback.

Typography now uses locally bundled Inter Regular, Medium, SemiBold, and Bold, downloaded from the [Expo Google Fonts Inter source](https://github.com/expo/google-fonts/tree/main/font-packages/inter). The four TTF files total approximately 1.31 MiB. The font is by the Inter Project Authors and licensed under the SIL Open Font License 1.1; its notice is retained at `branding/licenses/Inter-OFL.txt` from [Google Fonts](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt). No runtime package or network font request is needed. Existing `expo-font` loads the local faces; shared typography maps existing semantic weights to the correct face and preserves system font fallback on loading failure. Android text scaling remains enabled. Indigo, purple, lavender, mint accents, neutral text, surfaces, and spacing remain centralized in the existing theme.

The latest owner request also authorizes current-logo launcher/splash branding: `app.config.ts` points the app icon and splash image to the faithful PNG rendition on white. The separate `do-well-adaptive-foreground.png` centers a proportionally scaled 312px rendition on a transparent 512px canvas (100px padding) to protect the artwork within Android adaptive-icon masks. This is layout padding, with no logo tracing/recoloring. Generated native Android files were not changed or rebuilt; installed native artwork updates on a future intentional native build.

These assets are frontend-only and do not alter Supabase, authentication, schemas, API contracts, credentials, permissions, or native project configuration. Preserve the listed licenses when redistributing the application.
