# Competition Demo Runbook & Judging Script

**Document:** `docs/DEMO_RUNBOOK.md`  
**Application:** DO-WELL (Neighborhood Gig Marketplace)  
**Target Duration:** 3 to 5 minutes  
**Target Audience:** Competition Judges & Technical Reviewers  
**Fallback Strategy:** Offline Demo Mode (Zero-network fail-safe)  

---

## 1. Executive Pitch (30 Seconds)

> "In the Philippines, millions of informal workers and household employers rely on word-of-mouth or unvetted social media groups to find neighborhood gigs. Informal gigs lack safety, clear deliverables, fair agreed rates, and reliable payment proof.
> 
> **DO-WELL** is a privacy-first, zero-external-cost Android marketplace built for real Philippine community conditions. It features an AI-assisted structured job brief builder with 100% deterministic local fallbacks, explainable nearby noticeboard ranking, atomic contracts with milestone evidence, and weak-connectivity resilience that functions even on spotty mobile data."

---

## 2. Live Walkthrough Script (3–4 Minutes)

### Act 1: Zero-Cost AI Job Brief Builder (Employer Maya)
1. **Open App**: Tap the **DO-WELL** icon. Show clean high-contrast dark theme optimized for readability and battery life.
2. **Post Notice**: Tap `+ Post Notice`.
3. **Trigger AI Assistant**: Tap `"Use AI Brief Assistant"`.
4. **Input Natural Task**: Type:
   > *"Need help queueing early for DFA passport renewal at SM Megamall tomorrow morning at 7 AM. Budget 500 pesos."*
5. **Generate Brief**: Tap `"Generate Structured Brief"`.
   - *Highlight for Judges:* Point out that the brief is generated instantaneously using deterministic structured heuristics with zero external LLM API cost, zero subscription dependencies, and zero privacy leakage.
6. **Review & Publish**: Tap `"Apply Draft to Form"`, select location `"Ortigas Center, Mandaluyong"`, and tap `"Post Notice"`.

### Act 2: Explainable Nearby Discovery (Worker Alex)
1. **Switch Persona / Mode**: Toggle the top bar switch to **Worker** mode.
2. **Observe Noticeboard**:
   - The newly posted DFA errand appears at the top of the feed.
   - Point to the **Nearby Badge** and explainable ranking criteria (distance calculation based on coarse foreground GPS, category matching, and fair budget).
3. **Inspect Details**: Tap the notice to view full task checklist and safety constraints.
4. **Submit Application**: Tap `"Apply for this Gig"`, enter bid (`PHP 500`) and note:
   > *"I live nearby in Mandaluyong and can line up before 7:00 AM."*
5. Tap `"Submit Application"`.

### Act 3: Atomic Agreement & Selection (Employer Maya)
1. **Switch Back to Employer Mode**: View the gig in `"Posted Notices"`.
2. **Review Applicant**: View Alex's bid and rating badge.
3. **Atomic Select**: Tap `"Select Worker"`.
   - *Highlight for Judges:* Emphasize the atomic database transaction: when an employer selects a worker, all other applicants are notified, and an agreed contract with a locked rate is created instantly.

### Act 4: Work Submission with Image Evidence (Worker Alex)
1. **Switch to Worker**: Tap `Activity` tab -> select active assignment.
2. **Attach Evidence**:
   - Tap `"Add Evidence Photo"` (camera or gallery).
   - Show private client-side image validation (5MB cap, JPEG/PNG/WEBP, stripped EXIF metadata for privacy).
3. **Submit Work**: Add note *"Arrived at DFA, queue ticket #14 secured."* and tap `"Submit Work for Approval"`.

### Act 5: Verification & Completion (Employer Maya)
1. **Employer Review**: Employer opens the assignment.
2. **View Evidence**: Shows private signed thumbnail with strict time-limited access.
3. **Approve & Complete**: Tap `"Approve Work"`.
   - Contract status advances to `Completed`.
   - Activity log captures verifiable timestamped milestone.

---

## 3. Resilience & Offline Contingency Demonstration

### Weak-Connectivity Test:
1. Turn on **Airplane Mode** on the device.
2. Notice the prominent **Amber Offline Banner** appear at the top:
   > *"Offline: You're viewing saved data. Changes will sync when reconnected."*
3. Open discovery feed:
   - Notice data still renders seamlessly from the user-scoped bounded local cache.
   - Shows **"Saved snapshot"** badge with exact time.
4. Draft a new application while offline:
   - Show that draft inputs are preserved in local storage across screen reloads.
5. Turn off Airplane Mode:
   - Banner clears automatically, showing live connectivity restoration.

---

## 4. Fail-Safe: Instant Offline Demo Mode Pivot

If external network connectivity completely drops or Wi-Fi is unavailable in the judging hall:
1. Tap the `"Demo Preview"` button on the sign-in screen.
2. Show the judges the self-contained offline demonstration sandbox:
   - Pre-loaded with fictional neighborhood personas (*Maya Santos* and *Alex Reyes*).
   - Complete multi-role marketplace lifecycle runs entirely in local memory and AsyncStorage.
   - Prominent header discloses: *"DEMO MODE - LOCAL DATA (No account needed)"*.
   - One-tap `"Reset demo data"` returns the demo to the clean starting scenario instantly.
