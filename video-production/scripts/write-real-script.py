"""Rewrite script.json chapters 03+ around the real hosted-app recordings."""
import json
import pathlib

base = pathlib.Path(__file__).resolve().parent.parent
p = base / 'script.json'
d = json.loads(p.read_text(encoding='utf-8'))
by_id = {c['id']: c for c in d['chapters']}
hook, ctx = by_id['01-hook'], by_id['02-context']
ctx['narration'] = ctx['narration'].replace(
    " They establish the context for our project; they do not prove that one application can solve unemployment.", "")
close = by_id.get('12-close') or by_id['14-close']
close['id'] = '14-close'
d['runtime'] = 'Live Do Well Android app · hosted backend · two accounts'


def ph(at, kicker, title, body, clip, step):
    return {'at': at, 'kind': 'phone', 'kicker': kicker, 'title': title, 'body': body, 'clip': clip, 'step': step}


def chapter(cid, duration, narration, beats):
    return {'id': cid, 'duration': duration, 'lang': 'en', 'narration': narration, 'beats': beats}


chapters = [
    hook, ctx,
    chapter('03-problem', 28,
            "Think of a student who wants a few paid hours around class, or someone already working who needs more. "
            "On the other side, a small café needs extra hands for one busy weekend. Both sides face the same three questions. "
            "Where is the right work? What exactly needs to be done? And how do both people know the job is finished?",
            [{'at': 0, 'kind': 'people', 'kicker': 'TWO SIDES OF A SHORT-TERM NEED', 'title': 'Time to contribute.\nWork to get done.', 'body': ''},
             {'at': 13, 'kind': 'questions', 'kicker': 'THREE QUESTIONS', 'title': 'Find it.\nDefine it.\nFinish it.', 'body': 'Relevant opportunities → clear expectations → a visible outcome'}]),
    chapter('04-introduce', 22,
            "This is Do Well. Find nearby work. Get it done well. A native Android app for short-term local and remote gigs, "
            "running on a live cloud backend. Meet Maya, who runs a café in Makati, and Alex, a student looking for extra work. "
            "Everything you are about to see is the real app.",
            [{'at': 0, 'kind': 'reveal', 'kicker': 'ANDROID · PRODUCTIVITY', 'title': 'DO WELL', 'body': 'Find nearby work. Get it done well.'},
             ph(10, 'MEET THE PEOPLE', 'Maya posts.\nAlex delivers.', 'Two accounts. One live marketplace.', 'e04b', 0)]),
    chapter('05-employer', 40,
            "Maya needs help setting up a weekend community event. Instead of a vague post, she opens the Job Brief Builder. "
            "She describes the task in one sentence, then picks a category, the work mode, a general area and her budget. "
            "The builder turns that into a structured brief: a clear title, the scope, step by step tasks with acceptance criteria, and safety notes. "
            "Maya applies it to the form, sets the title and her six hundred peso offer, and publishes. Within seconds, the gig is live.",
            [ph(0, '01 · EMPLOYER · MAYA', 'Start with a\nclear brief.', 'Job Brief Builder: one sentence in,\na structured brief out.', 'e05a', 0),
             ph(17, 'JOB BRIEF BUILDER', 'Tasks you can\ncheck off.', 'Steps with acceptance criteria\nand safety notes.', 'e05b', 0),
             ph(28, 'PUBLISHED', 'Live in\nseconds.', 'Weekend cafe event setup\nLegaspi Village, Makati · ₱600', 'e05c', 0)]),
    chapter('06-discover', 38,
            "Now Alex. His home screen lists open gigs, with filters for on site and remote work. Location is optional. "
            "When Alex looks for nearby work, Android shows its own permission prompt, and Do Well asks only for approximate location, while the app is in use. "
            "There is no background tracking, and exact addresses are never shared. "
            "Alex can also skip GPS entirely, and pick a Metro Manila hub and a search radius. "
            "Every result shows a rounded distance and a plain reason why it fits.",
            [ph(0, '02 · WORKER · ALEX', 'Discover\nnearby work.', 'On-site and remote filters\nin one feed.', 'e06a', 1),
             ph(11, 'ANDROID · LOCATION', 'Approximate.\nWhile in use.', 'Native permission prompt.\nNo background tracking.', 'e06b', 1),
             ph(25, 'NO GPS NEEDED', 'Pick a hub.\nSee why it fits.', 'Rounded distance and a reason\non every card.', 'e06c', 1)]),
    chapter('07-apply', 26,
            "Alex opens the café gig. He sees the pay, the general area, and the full brief. "
            "Meeting details are agreed directly with the employer, never posted publicly. "
            "He applies with a short note that only Maya can read, and the application appears in his work list right away.",
            [ph(0, '03 · APPLY', 'Apply with\na short note.', 'Pay, area and scope are clear\nbefore applying.', 'e07a', 1),
             ph(16, 'MY WORK', 'Tracked from\nthe first tap.', 'Applied · pending review', 'e07b', 1)]),
    chapter('08-select', 36,
            "On Maya's phone, the Activity feed reports a new application. She turns on device alerts, and Android asks for notification permission "
            "at the moment it is useful, not at launch. Maya reads Alex's note and selects him. Do Well explains exactly what happens next: "
            "the listing closes, other pending applications are declined, and an agreement is proposed. Nothing is final until Alex accepts.",
            [ph(0, '04 · EMPLOYER REVIEW', 'Alerts, when\nthey matter.', 'Notification permission,\nasked in context.', 'e08a', 2),
             ph(15, 'SELECTION', 'The employer\nmakes the choice.', 'Listing closes.\nAn agreement is proposed.', 'e08b', 2)]),
    chapter('09-agreement', 38,
            "Alex sees the update in his own Activity feed. He opens the task agreement, reviews the terms and the agreed amount, and accepts. "
            "The agreement is now active. Maya then breaks the job into milestones: arranging tables and chairs, setting out supplies, "
            "and tidying up afterwards. Both of them now share one checklist, so expectations are clear before the work begins.",
            [ph(0, '05 · AGREEMENT', 'Both sides\nconfirm.', 'Proposed → accepted → active', 'e09a', 2),
             ph(18, 'MILESTONES', 'One shared\nchecklist.', 'Arrange tables · Set out supplies\n· Tidy up', 'e09b', 2)]),
    chapter('10-submit', 32,
            "On Saturday, Alex starts each milestone, so Maya can follow the progress. When the work is done, he writes a completion note. "
            "He can attach up to three photos from the gallery or the camera, and Android asks for camera access only when he taps. "
            "Then he submits the work for review.",
            [ph(0, '06 · WORKER DELIVERY', 'Progress you\ncan follow.', 'Each milestone moves\nto in progress.', 'e10a', 3),
             ph(14, 'ANDROID · CAMERA', 'Evidence,\nwith permission.', 'Up to three photos\n· camera or gallery', 'e10b', 3)]),
    chapter('11-approve', 30,
            "Maya's phone lights up with Android notifications: the agreement confirmed, each milestone started, and the work submitted. "
            "She opens the submission, reads Alex's note, and approves it. She could also request a revision. "
            "All three milestones are marked approved, and the task agreement is complete.",
            [ph(0, '07 · NOTIFICATIONS', 'Real Android\nnotifications.', 'Grouped alerts for every\nstep of the job.', 'e11a', 4),
             ph(13, 'REVIEW & APPROVE', 'Approved.\nCompleted.', '3 of 3 milestones approved', 'e11b', 4)]),
    chapter('12-android', 38,
            "Do Well is built for the way Android phones are really used. Connections drop, so the app watches network state. "
            "When Alex goes offline, it switches to a saved snapshot and says so clearly, then refreshes once he reconnects. "
            "Permissions are requested in context and kept to a minimum. And when Maya approves, Alex gets his own notification, "
            "and the job moves to completed in his work list and profile.",
            [{'at': 0, 'kind': 'android', 'kicker': 'BUILT FOR ANDROID', 'title': 'Native where\nit counts.', 'body': '',
              'items': ['Approximate, in-use location', 'Runtime permissions in context', 'Notification channels',
                        'Camera & gallery evidence', 'Network-aware offline mode', 'Saved snapshots & drafts']},
             ph(9, 'ANDROID · CONNECTIVITY', 'Offline?\nStill useful.', 'Saved snapshot · clear status\n· refresh on reconnect', 'e12a', 4),
             ph(23, '08 · COMPLETE', 'Done, on\nboth phones.', 'Alex sees the approval\nand a completed job.', 'e12b', 4)]),
    chapter('13-difference', 28,
            "So what makes Do Well different? A structured brief instead of a vague post. Discovery that explains itself. "
            "An agreement both sides confirm, milestones both can see, and a clear finish. For judging, that means innovation in the workflow, "
            "a native Android experience, privacy first security, complete functionality, and a calm, consistent user experience.",
            [{'at': 0, 'kind': 'pillars', 'kicker': 'WHY DO WELL', 'title': 'One connection.\nA complete workflow.', 'body': 'Brief → Discover → Apply → Agree → Deliver → Approve'},
             {'at': 13, 'kind': 'criteria', 'kicker': 'FIVE LENSES FOR EVALUATION', 'title': 'Built to be assessed.', 'body': ''}]),
    close,
]
import re


def sentences(text):
    # Same split as tools/generate_narration.py, so cue indexes match measured cues.
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ü0-9])', text) if s.strip()]


extra = {
    '05-employer': (" Every field stays editable before it goes live.", 'Instead of a vague post'),
    '07-apply': (" If his plans change, he can withdraw it.", None),
    '11-approve': (" The completed agreement keeps a record of the six hundred pesos they agreed on.", None),
}
for c in chapters:
    if c['id'] in extra:
        c['narration'] += extra[c['id']][0]

# Seconds of footage under music after each chapter's narration.
pads = {'02-context': 3, '03-problem': 4, '04-introduce': 3, '05-employer': 10, '06-discover': 9, '07-apply': 8,
        '08-select': 9, '09-agreement': 9, '10-submit': 10, '11-approve': 9, '12-android': 8, '13-difference': 4}
# Beat k starts at the sentence beginning with this text (k >= 1).
cues = {
    '03-problem': ['Both sides face'],
    '04-introduce': ['Meet Maya'],
    '05-employer': ['The builder turns', 'Maya applies it'],
    '06-discover': ['Location is optional', 'Alex can also skip'],
    '07-apply': ['He applies with'],
    '08-select': ['Maya reads'],
    '09-agreement': ['Maya then breaks'],
    '10-submit': ['He can attach'],
    '11-approve': ['She opens the submission'],
    '12-android': ['Connections drop', 'And when Maya approves'],
    '13-difference': ['For judging'],
}
for c in chapters:
    if c['id'] in pads:
        c['pad'] = pads[c['id']]
    if c['id'] not in ('01-hook', '02-context', '14-close'):
        c.update(voice='af_heart', speed=0.96, gap=0.85)
    if c['id'] in cues:
        said = sentences(c['narration'])
        c['beats'][0]['cue'] = 0
        for beat, start in zip(c['beats'][1:], cues[c['id']]):
            beat['cue'] = next(i for i, s in enumerate(said) if s.startswith(start))

d['chapters'] = chapters
d['duration'] = sum(c['duration'] for c in chapters)
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(d['duration'], [c['id'] for c in chapters])
print(json.dumps(close, ensure_ascii=False)[:700])
