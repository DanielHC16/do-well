"""Production-app ADB automation helpers for the real redesigned frontend.

Secrets are read from the git-ignored account file and never printed.
Usage: py -3.12 flow.py <step> [args]
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from device import adb, dump, screenshot, record, pull, ROOT

ACCOUNTS = Path(__file__).resolve().parents[2] / '.codex-artifacts' / 'video-accounts.local.json'


def nodes():
    return list(dump())


def bounds(node):
    a, b, c, d = map(int, re.findall(r'\d+', node.get('bounds')))
    return a, b, c, d


def find(label, exact=True, index=0):
    found = [n for n in nodes() if (label in (n.get('text'), n.get('content-desc'))) or (not exact and label.lower() in ((n.get('text') or '') + ' ' + (n.get('content-desc') or '')).lower())]
    if len(found) <= index:
        raise ValueError('Visible control missing: ' + label)
    return found[index]


def tap(label, exact=True, index=0):
    a, b, c, d = bounds(find(label, exact, index))
    adb('shell', 'input', 'tap', (a + c) // 2, (b + d) // 2)


def tap_xy(x, y):
    adb('shell', 'input', 'tap', x, y)


def type_text(text):
    # Type in short bursts so the field keeps up on the software renderer.
    for i in range(0, len(text), 12):
        part = text[i:i + 12].replace(' ', '%s')
        part = "'" + part.replace("'", "'\\''") + "'"
        adb('shell', 'input', 'text', part)


def fill(label, text, exact=True):
    hide_keyboard()
    time.sleep(0.9)
    def locate():
        return [n for n in nodes() if n.get('class') == 'android.widget.EditText' and label in (n.get('content-desc'), n.get('text'))]
    fields = locate()
    # Bring fields that are off-screen or under the lower edge into view first.
    for _ in range(3):
        if not fields:
            break
        a, b, c, d = bounds(fields[0])
        if b < 150 or d <= b or d > 1400:
            swipe_up(450 if d > 1400 or d <= b else -450, 600) if b >= 150 else swipe_down(450, 600)
            time.sleep(0.9)
            fields = locate()
        else:
            break
    if fields:
        a, b, c, d = bounds(fields[0])
        tap_xy((a + c) // 2, (b + d) // 2)
    else:
        tap(label, exact)
    time.sleep(0.4)
    adb('shell', 'input', 'keycombination', '113', '29')  # CTRL+A
    adb('shell', 'input', 'keyevent', '67')  # DEL
    time.sleep(0.4)
    type_text(text)
    time.sleep(0.3)


def hide_keyboard():
    # BACK closes the IME when it is open; only call this while typing.
    if b'mInputShown=true' in adb('shell', 'dumpsys', 'input_method'):
        adb('shell', 'input', 'keyevent', '4')


def swipe_up(distance=700, ms=500):
    adb('shell', 'input', 'swipe', 360, 1200, 360, 1200 - distance, ms)


def swipe_down(distance=700, ms=500):
    adb('shell', 'input', 'swipe', 360, 500, 360, 500 + distance, ms)


def account(role):
    return json.loads(ACCOUNTS.read_text(encoding='utf-8'))[role]


def texts():
    return [(n.get('text') or n.get('content-desc')) for n in nodes() if (n.get('text') or n.get('content-desc'))]


if __name__ == '__main__':
    step, *args = sys.argv[1:]
    if step == 'signup':
        acc = account(args[0])
        fill('Email address', acc['email'])
        fill('Password', acc['password'])
        hide_keyboard()
        time.sleep(0.5)
        tap('Offer work' if args[0] == 'employer' else 'Find work')
        time.sleep(0.3)
        tap('Create account', index=1)
    elif step == 'signin':
        acc = account(args[0])
        fill('Email address', acc['email'])
        fill('Password', acc['password'])
        hide_keyboard()
        time.sleep(0.4)
        tap('Sign in', index=1)
    elif step == 'tap':
        tap(args[0], exact=not (len(args) > 1 and args[1] == 'loose'))
    elif step == 'xy':
        tap_xy(int(args[0]), int(args[1]))
    elif step == 'type':
        type_text(args[0])
    elif step == 'fill':
        fill(args[0], args[1])
    elif step == 'hide':
        hide_keyboard()
    elif step == 'up':
        swipe_up(int(args[0]) if args else 700)
    elif step == 'down':
        swipe_down(int(args[0]) if args else 700)
    elif step == 'texts':
        print('\n'.join(texts()))
    elif step == 'shot':
        screenshot(args[0])


def post_direct(title, category, mode, area, budget, desc):
    """Post a gig through the real form from the employer home screen."""
    tap_xy(360, 1465)  # centre + action
    time.sleep(3)
    fill('e.g. Paint Front Garden Fence', title)
    hide_keyboard(); time.sleep(0.4)
    tap(category); time.sleep(0.3)
    swipe_up(900); time.sleep(1)
    tap(mode); time.sleep(0.5)
    if area:
        fill('e.g. Poblacion, Makati', area)
    fill('500', budget)
    fill('Describe what the worker needs to do, tools provided, and timing expectations.', desc, exact=False) if False else None
    hide_keyboard(); time.sleep(0.4)
    field = [n for n in nodes() if n.get('class') == 'android.widget.EditText' and (n.get('text') or '').startswith('Describe what the worker')]
    a, b, c, d = bounds(field[0])
    tap_xy((a + c) // 2, (b + d) // 2); time.sleep(0.4)
    type_text(desc)
    hide_keyboard(); time.sleep(0.4)
    swipe_up(900); time.sleep(0.8)
    tap('Post notice'); time.sleep(8)
    return texts()


def start_rec(name, limit=170):
    record(name, limit)
    time.sleep(2.5)


def stop_rec(name):
    time.sleep(2)
    try:
        adb('shell', 'pkill', '-2', 'screenrecord')
    except RuntimeError:
        pass  # already stopped at its time limit
    time.sleep(3)
    adb('pull', f'/sdcard/{name}.mp4', ROOT.parent / 'public/footage/real' / (name + '.mp4'))
    print('pulled', name)


def switch_account(role):
    """Sign out from the bottom-nav Profile tab and sign in as role."""
    for _ in range(4):
        if 'Profile' in texts():
            break
        adb('shell', 'input', 'keyevent', '4'); time.sleep(2)
    tap('Profile'); time.sleep(3)
    tap('Sign out'); time.sleep(4)
    acc = account(role)
    fill('Email address', acc['email']); fill('Password', acc['password'])
    hide_keyboard(); time.sleep(0.8)
    n = [x for x in nodes() if x.get('class') == 'android.widget.Button' and x.get('content-desc') == 'Sign in']
    a, b, c, d = bounds(n[0]); tap_xy((a + c) // 2, (b + d) // 2)
    time.sleep(12)


def add_step(title, desc, first=False):
    if not first:
        tap('Add milestone'); time.sleep(2.5)
        swipe_up(500, 800); time.sleep(1.2)
    fill('Step title (e.g., Mount rack fixtures)', title)
    fill('Optional description of tasks for this step...', desc)
    hide_keyboard(); time.sleep(1)
    swipe_up(400, 800); time.sleep(1.2)
    tap('Save milestone'); time.sleep(4)
