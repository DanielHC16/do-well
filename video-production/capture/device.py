"""ADB-only capture helpers. This never modifies the application or hosted data."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
sys.stdout.reconfigure(encoding='utf-8')
ADB = Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'

def adb(*args, timeout=25):
    result = subprocess.run([str(ADB), *map(str, args)], capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace'))
    return result.stdout

def dump():
    adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/video-ui.xml')
    adb('pull', '/sdcard/video-ui.xml', ROOT / 'ui.xml')
    return ET.parse(ROOT / 'ui.xml').getroot().iter('node')

def tap(label):
    nodes = list(dump())
    matches = [n for n in nodes if label in (n.get('text'), n.get('content-desc'))]
    if not matches:
        raise ValueError('Visible control missing: ' + label)
    node = matches[0]
    a,b,c,d = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell','input','tap',(a+c)//2,(b+d)//2)

def screenshot(name):
    adb('shell','screencap','-p','/sdcard/video-shot.png')
    adb('pull','/sdcard/video-shot.png', ROOT / (name + '.png'))

def record(name, duration):
    filename = f'/sdcard/{name}.mp4'
    log = open(ROOT / (name + '.log'), 'wb')
    proc = subprocess.Popen([str(ADB),'shell','screenrecord','--size','720x1600','--bit-rate','4000000','--time-limit',str(duration),filename], stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
    (ROOT / 'recording.json').write_text(json.dumps({'name':name,'pid':proc.pid,'duration':duration,'started':time.time()}))
    print(f'Recording {name}, {duration}s limit, pid {proc.pid}')

def pull(name):
    target = ROOT.parent / 'public/footage' / (name + '.mp4')
    adb('pull', f'/sdcard/{name}.mp4', target)
    print(target)

if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('action',choices=['dump','tap','shot','record','pull','text','swipe','back','stop'])
    p.add_argument('values',nargs='*')
    a=p.parse_args()
    if a.action=='dump':
        for n in dump():
            if n.get('text') or n.get('content-desc'):
                print(json.dumps({k:n.get(k) for k in ['text','content-desc','bounds','class']},ensure_ascii=False))
    elif a.action=='tap': tap(a.values[0])
    elif a.action=='shot': screenshot(a.values[0])
    elif a.action=='record': record(a.values[0],int(a.values[1]))
    elif a.action=='pull': pull(a.values[0])
    elif a.action=='text': adb('shell','input','text',a.values[0].replace(' ','%s'))
    elif a.action=='swipe': adb('shell','input','swipe',*a.values)
    elif a.action=='back': adb('shell','input','keyevent','4')
    elif a.action=='stop': adb('shell','pkill','-2','screenrecord')
