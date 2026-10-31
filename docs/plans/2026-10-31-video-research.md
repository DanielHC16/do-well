# DO WELL Competition Video: Research and Editorial Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Support the eight-minute competition film with verified Philippine employment context and defensible product claims.

**Architecture:** Original motion graphics and narration summarize attributed research. Genuine Android recordings establish demonstrated behavior; source code and historical test records establish only implementation context.

**Tech Stack:** PSA Labor Force Survey, primary policy research, Android capture, Remotion, FFmpeg.

**Research checked:** 2026-10-31, Asia/Manila. No third-party broadcast footage was downloaded or cleared.

## Editorial decision

Use underemployment as the opening context. It connects more directly to additional short-term work than a broad promise to solve unemployment. Use independently written Tagalog narration, followed by English narration. Do not use GMA footage, logos, anchor likenesses, broadcast audio, or a simulated branded newsroom. Public access and attribution do not establish broadcast reuse rights.

National figures establish context, not demand for this particular app, a count of potential customers, product effectiveness, or impact. The café scenario and flexible-work needs are illustrative design assumptions. No placement, revenue, safety, or income results are established.

## Verified figures

[PSA, August 2026 Labor Force Survey](https://psa.gov.ph/statistics/labor-force-survey/press-release/node/1684084287), released **October 7, 2026**, reference **2026-325**:

| Measure | August 2026 | Comparison |
| --- | --- | --- |
| Underemployed people | 5.90 million | Already employed, seeking extra hours, another job, or longer-hours work |
| Underemployment rate | 11.9% of employed people | July 2026: 12.9%; August 2025: 10.7% |
| Unemployed people | 2.77 million | July 2026: 3.14 million; August 2025: 2.03 million |
| Unemployment rate | 5.3% of labor force | July 2026: 6.0%; August 2025: 3.9% |
| Underemployed youth aged 15–24 | Approximately 587,000 | 9.9% of employed youth |

Both headline rates improved month on month and remained higher year on year. Do not say they were continuously rising. Youth data includes minors; do not imply that the app admits minors or that all youth are students. Student-specific demand for flexible gigs was not verified.

The PSA page footer states **CC BY 4.0 unless otherwise stated**. Produce original graphics with attribution rather than reproducing a screenshot. Credit: **Philippine Statistics Authority, August 2026 LFS, released 7 Oct 2026. CC BY 4.0. Graphic adapted for DO WELL.** Link the release and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) in the source manifest.

## Cross-checks and additional context

- [News5, “Unemployment, underemployment decline in August”](https://news.tv5.com.ph/breaking/read/unemployment-underemployment-decline-in-august), **October 7, 2026, 09:48 AM**: independently corroborates the headline figures and both comparison directions. Its site states all rights reserved. Use it for corroboration; no article text, footage, branding, or photographs are incorporated.
- [DOLE, “DOLE welcomes August labor market improvement, strengthens pathways to sustainable work”](https://dole.gov.ph/news/dole-welcomes-august-labor-market-improvement-strengthens-pathways-to-sustainable-work/), **October 7, 2026** as supplied in the brief and indexed text: direct page returned HTTP 403, while search indexing exposed the release. It discusses school-to-work pathways and employment facilitation. Its count is 5.91 million, differing from PSA; prefer the primary PSA count. Do not base an on-screen statistic solely on this inaccessible page.
- [PIDS, “Building a Strong and Sustainable Pathway for Middle-Skilled Workers”](https://pids.gov.ph/publication/policy-notes/building-a-strong-and-sustainable-pathway-for-middle-skilled-workers), **September 29, 2025**, PN 2025-15, [DOI](https://doi.org/10.62986/pn2025.15): the primary policy-note abstract describes misalignment between training competencies and industry needs. It supports a careful skills-matching context, not a claim that DO WELL resolves national skills mismatch. Use a short paraphrase, no report art or copied passages. Exact publication redistribution license was not established.

## Recommended opening

**00:00–00:18, original Tagalog:**

“May trabaho, pero naghahanap pa rin ng dagdag na pagkakakitaan. Noong Agosto 2026, 5.9 milyong Pilipino ang underemployed, ayon sa Philippine Statistics Authority. Paano magiging mas malinaw ang paghanap at pagtapos ng dagdag na trabaho?”

**English subtitle:**

“Employed, yet still looking for additional earning opportunities. In August 2026, 5.9 million Filipinos were underemployed, according to the Philippine Statistics Authority. How can finding and completing extra work become clearer?”

Measure the synthesized audio; shorten the final question if needed instead of accelerating it unnaturally. Identify the opening as **original narration**, not a news extract.

**00:18–00:50, English transition:**

“Underemployment means someone already works, but wants more hours, another job, or work with longer hours. The August figures improved from July, while remaining higher than a year earlier. They describe a national challenge. Our project takes one practical piece: helping people understand, find, and complete short-term work.”

Keep the PSA label on screen for both opening scenes. Display only a few essential figures; do not overcrowd the presentation with the full research table.

## Repository claim boundaries

The README and old demo runbook contain broad promotional or historical language. Prefer the current build and these explicit constraints:

- `docs/PRODUCT_REQUIREMENTS.md:66`: deterministic brief construction is not genuine model inference. Call the demonstrated feature **Job Brief Builder** or **structured brief assistance**.
- `docs/PRODUCT_REQUIREMENTS.md:74`: foreground location is optional and requested in context. `:52` preserves manual location selection. Remote discovery should not be sold as requiring GPS.
- `docs/PRODUCT_REQUIREMENTS.md:76`: notification baseline is local; no remote-push claim without actual verification.
- `docs/PRODUCT_REQUIREMENTS.md:80`: caches and drafts do not establish background synchronization.
- `docs/PRODUCT_REQUIREMENTS.md:98`: payments, escrow, wallets, and payouts are deferred. Compensation is an agreed/displayed amount, not an in-app transfer.
- `HANDOVER.MD:21`: the synthetic runtime is a fallback, not proof of hosted Auth, synchronization, RLS, Storage, or multi-user transactions.
- `docs/HOSTED_DEMO_SETUP.md:111`: hosted rehearsal requires separate employer and worker identities. A single account switching modes is not a cross-principal hiring demonstration.
- `docs/reports/2026-10-31-brand-redesign.md:24`: redesign screenshots show empty accounts. Those screenshots do not establish successful workflow behavior.
- `src/shared/ui/theme.ts:7`: navy/purple/lavender/mint are actual repository brand tokens. Licensed Inter and Outfit font files/notices are in `branding/fonts/` and `branding/licenses/`.
- `docs/PRODUCT_REQUIREMENTS.md:111`: exact official competition duration, artifact rules, and eligibility remain unverified in repository evidence. The user's production brief requests five themes with equal weights, but no official rubric was located. Cover **Innovation, Android Platform, Security, Functionality, User Experience** without asserting verified 20% weights.

## Manifest handoff

The production coordinator may copy this manifest into `video-production/research/sources.json`. Writing in that directory is outside this architect agent's artifact permissions.

```json
{
  "checkedOn": "2026-10-31",
  "timezone": "Asia/Manila",
  "sources": [
    {
      "id": "PSA-AUG2026",
      "title": "August 2026 Labor Force Survey, reference 2026-325",
      "publisher": "Philippine Statistics Authority",
      "url": "https://psa.gov.ph/statistics/labor-force-survey/press-release/node/1684084287",
      "publicationDate": "2026-10-07",
      "verified": true,
      "license": "CC BY 4.0 unless otherwise stated, per page footer",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "use": "Original attributed motion graphics and factual paraphrase",
      "timeline": ["00:00-00:18", "00:18-00:50", "07:40-08:00"],
      "figures": {"underemployedMillions": 5.90, "underemploymentPercent": 11.9, "unemployedMillions": 2.77, "unemploymentPercent": 5.3},
      "locator": "Underemployment section, web lines 398-408; unemployment section, web lines 344-347"
    },
    {
      "id": "NEWS5-AUG2026",
      "title": "Unemployment, underemployment decline in August",
      "publisher": "News5",
      "url": "https://news.tv5.com.ph/breaking/read/unemployment-underemployment-decline-in-august",
      "publicationDate": "2026-10-07",
      "verified": true,
      "license": "All rights reserved; no media or prose reused",
      "use": "Research cross-check only",
      "timeline": []
    },
    {
      "id": "DOLE-AUG2026",
      "title": "DOLE welcomes August labor market improvement, strengthens pathways to sustainable work",
      "publisher": "Department of Labor and Employment",
      "url": "https://dole.gov.ph/news/dole-welcomes-august-labor-market-improvement-strengthens-pathways-to-sustainable-work/",
      "publicationDate": "2026-10-07",
      "verified": "Search-index text only; direct HTTP 403",
      "license": "Not established; no media or prose reused",
      "use": "Context only; count differs slightly from PSA, so prefer PSA",
      "timeline": []
    },
    {
      "id": "PIDS-PN2025-15",
      "title": "Building a Strong and Sustainable Pathway for Middle-Skilled Workers",
      "publisher": "Philippine Institute for Development Studies",
      "url": "https://pids.gov.ph/publication/policy-notes/building-a-strong-and-sustainable-pathway-for-middle-skilled-workers",
      "doi": "https://doi.org/10.62986/pn2025.15",
      "publicationDate": "2025-09-29",
      "verified": true,
      "license": "Exact redistribution license not established; no report media reused",
      "use": "Optional concise paraphrase of skills/training mismatch context",
      "timeline": ["00:50-01:27"]
    },
    {
      "id": "GMA-NOT-CLEARED",
      "title": "24 Oras Express, original broadcast reference supplied by user",
      "publisher": "GMA Integrated News",
      "url": "https://www.dailymotion.com/video/xbji77u",
      "publicationDate": "2026-10-07",
      "verified": false,
      "license": "No explicit reuse permission or license established",
      "use": "Excluded; replaced with original Tagalog narration",
      "referenceTimestamps": ["17:13-17:52", "19:22-19:36"],
      "timeline": []
    }
  ]
}
```

## Production verification tasks

1. Copy the research manifest, source label, and approved claim boundaries into the isolated production workspace. Verify every numeric graphic against the table above.
2. Measure Tagalog and English audio durations. Verify subtitles preserve the distinction between underemployment and unemployment.
3. In every app scene, label the actual runtime. For synthetic footage, retain a readable **Offline demonstration · fictional data** disclosure throughout.
4. Verify each claimed action in authentic Android footage. Omit unverified photo upload, notifications, administration, and backend guarantees rather than filling gaps with simulated success.
5. Review the final film for copyrighted media, unsupported promises, minor eligibility implications, payment claims, and unverified official rubric weights.

No application source, environment, dependencies, credentials, hosted data, or existing user files were changed by this research task.
