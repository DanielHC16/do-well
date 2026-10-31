"""Inspect the delivered bitstream and generate visual review contact sheets."""
import json
import pathlib
import re
import subprocess
import sys

base=pathlib.Path(__file__).resolve().parent.parent
tool=json.loads((base/'tools'/'toolchain.json').read_text(encoding='utf-8'))
data=json.loads((base/'composition'/'src'/'data.json').read_text(encoding='utf-8'))
video=base/'output'/'DO-WELL-UMAK-2026-FINAL.mp4'
out=base/'output'
logs=base/'logs'
ffmpeg=tool['ffmpeg']
subprocess.run([sys.executable,str(base/'scripts'/'validate-output.py'),'--ffprobe',tool['ffprobe'],'--video',str(video),'--report',str(out/'technical-qa.json')],check=True)
print('Decoding every video and audio packet; checking black, freeze, silence and loudness',flush=True)
command=[ffmpeg,'-hide_banner','-nostats','-i',str(video),'-vf','blackdetect=d=0.15:pix_th=0.05:pic_th=0.99,freezedetect=n=-60dB:d=2','-af','silencedetect=noise=-45dB:d=3,ebur128=peak=true','-f','null','-']
scan=subprocess.run(command,capture_output=True,text=True)
(logs/'full-decode-qa.log').write_text(scan.stderr,encoding='utf-8')
if scan.returncode:
    sys.exit('Full decode failed')
summary=scan.stderr[scan.stderr.rfind('Summary:'):]
black=re.findall(r'black_start:([0-9.]+) black_end:([0-9.]+) black_duration:([0-9.]+)',scan.stderr)
freeze=re.findall(r'lavfi.freezedetect.freeze_start: ([0-9.]+)',scan.stderr)
silence=re.findall(r'silence_start: ([0-9.]+)',scan.stderr)
# The default low-motion threshold also flags the deliberate subtle background
# animation. Verify decoded frame identity separately instead of calling these
# candidates rendering failures. A real preview run reproduced false positives
# while every one of its1106 decoded frames had a different hash.
hash_path=logs/'decoded-framehashes.txt'
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(video),'-map','0:v:0','-an','-f','framemd5',str(hash_path)],check=True)
hashes=[line.split(',')[-1].strip() for line in hash_path.read_text().splitlines() if line and not line.startswith('#')]
longest=0
run=0
last=None
exact=[]
for i,value in enumerate(hashes):
    if value==last:
        run+=1
    else:
        if run>=60:exact.append({'start':(i-run)/30,'duration':run/30})
        run=1
        last=value
    longest=max(longest,run)
if run>=60:exact.append({'start':(len(hashes)-run)/30,'duration':run/30})
report={'full_decode':'passed','black_intervals':black,'low_motion_candidates_for_visual_review':freeze,'exact_whole_frame_freezes_over_2s':exact,'longest_identical_frame_run':longest,'silence_over_3s':silence,'loudness_summary':summary,'visual_review':'contact sheets, source hold policy and sampled frames must be viewed before marking passed'}
(out/'signal-qa.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
if black or exact or silence:
    sys.exit('Unexpected black, frozen or silent intervals require editorial inspection')
frames=out/'qa-frames'
frames.mkdir(exist_ok=True)
for chapter in data['chapters']:
    stamp=chapter['start']+min(5,chapter['duration']/2)
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(stamp),'-i',str(video),'-frames:v','1',str(frames/(chapter['id']+'.png'))],check=True)
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(video),'-vf','fps=1/15,scale=480:270,tile=4x3','-fps_mode','vfr',str(out/'contact-%02d.jpg')],check=True)
print('Signal checks passed; contact sheets and chapter frame samples exported',flush=True)
