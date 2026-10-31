"""Resumable local Remotion render, per-chapter validation, mix and final QC."""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

base = pathlib.Path(__file__).resolve().parent.parent
composition = base / 'composition'
output = base / 'output'
chunks = output / 'chunks'
logs = base / 'logs'
chunks.mkdir(parents=True, exist_ok=True)
logs.mkdir(parents=True, exist_ok=True)
toolchain = json.loads((base / 'tools' / 'toolchain.json').read_text(encoding='utf-8'))
ffmpeg = toolchain['ffmpeg']
ffprobe = toolchain['ffprobe']
node = shutil.which('node')
if not node:
    sys.exit('Node is required')
subprocess.run([node, str(base/'scripts'/'prepare.mjs'), '--final'], check=True)
data = json.loads((composition/'src'/'data.json').read_text(encoding='utf-8'))

digest = hashlib.sha256()
for source in sorted((composition/'src').glob('*')):
    if source.is_file():
        digest.update(source.read_bytes())
for media in sorted((base/'public').rglob('*')):
    if media.is_file():
        digest.update(f'{media.name}:{media.stat().st_size}:{media.stat().st_mtime_ns}'.encode())
signature = digest.hexdigest()
state_path = output / 'render-state.json'
state = json.loads(state_path.read_text()) if state_path.exists() else {}
if state.get('signature') != signature:
    state = {'signature':signature,'completed':[],'frames':round(data['duration']*30)}

def probe(file):
    return json.loads(subprocess.run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(file)],check=True,capture_output=True,text=True).stdout)

def check_chunk(file, frames):
    if not file.is_file() or file.stat().st_size == 0:
        return False
    try:
        meta = probe(file)
        stream = next(s for s in meta['streams'] if s['codec_type']=='video')
        return int(stream.get('nb_frames',0)) == frames and stream['codec_name']=='h264'
    except (subprocess.CalledProcessError, KeyError, ValueError):
        return False

chrome = pathlib.Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
cli = composition / 'node_modules' / '@remotion' / 'cli' / 'remotion-cli.js'
for chapter in data['chapters']:
    start = round(chapter['start']*30)
    count = round(chapter['duration']*30)
    clip = chunks / (chapter['id']+'.mp4')
    if chapter['id'] in state['completed'] and check_chunk(clip,count):
        print(f'RESUME verified {chapter["id"]}', flush=True)
        continue
    print(f'RENDER {chapter["id"]}: frames {start}–{start+count-1}',flush=True)
    command = [node,str(cli),'render','src/index.ts','DoWellFilm',str(clip),f'--frames={start}-{start+count-1}','--codec=h264','--crf=18','--muted','--concurrency=2','--log=info']
    if chrome.exists():
        command.append('--browser-executable='+str(chrome))
    with (logs/(chapter['id']+'-render.log')).open('w',encoding='utf-8') as log:
        subprocess.run(command,cwd=composition,stdout=log,stderr=subprocess.STDOUT,check=True)
    if not check_chunk(clip,count):
        sys.exit(f'Chunk frame/codec validation failed: {clip}')
    if chapter['id'] not in state['completed']:
        state['completed'].append(chapter['id'])
    state_path.write_text(json.dumps(state,indent=2),encoding='utf-8')
    print(f'VALIDATED {chapter["id"]}: {count} frames',flush=True)

concat = output / 'concat.txt'
concat.write_text(''.join("file '"+str(chunks/(c['id']+'.mp4')).replace('\\','/').replace("'","'\\''")+"'\n" for c in data['chapters']),encoding='utf-8')
master = output / 'render-master.mp4'
subprocess.run([ffmpeg,'-hide_banner','-y','-f','concat','-safe','0','-i',str(concat),'-map','0:v:0','-an','-c:v','copy',str(master)],check=True,stdout=subprocess.DEVNULL,stderr=(logs/'concat.log').open('w'))
# Discard per-chapter AAC. Build source WAV stems at exact 48kHz sample offsets,
# avoiding independent AAC encoder priming/padding at every chapter boundary.
mix_command=[ffmpeg,'-hide_banner','-y']
filters=[]
labels=[]
for i,chapter in enumerate(data['chapters']):
    mix_command += ['-i',str(base/'public'/'audio'/(chapter['id']+'.wav'))]
    offset=round(chapter['start']*48000)
    filters.append(f'[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay={offset}S:all=1[n{i}]')
    labels.append(f'[n{i}]')
music_index=len(data['chapters'])
mix_command += ['-i',str(base/'public'/'audio'/'music.wav')]
duration=data['duration']
# Narration keys a sidechain compressor so the score sits under speech and
# rises in pauses, the reveal and the close.
filters.append(''.join(labels)+f'amix=inputs={len(labels)}:duration=longest:normalize=0,apad=whole_dur={duration},atrim=duration={duration},asplit=2[voice][key]')
filters.append(f'[{music_index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[music]')
filters.append('[music][key]sidechaincompress=threshold=0.03:ratio=3:attack=40:release=700:knee=4[duck]')
filters.append(f'[voice][duck]amix=inputs=2:duration=longest:normalize=0,atrim=duration={duration}[mix]')
mix_wav=output/'sample-aligned-mix.wav'
mix_command += ['-filter_complex',';'.join(filters),'-map','[mix]','-c:a','pcm_s24le','-ar','48000','-ac','2',str(mix_wav)]
with (logs/'source-audio-mix.log').open('w') as log:
    subprocess.run(mix_command,check=True,stdout=log,stderr=subprocess.STDOUT)
print('MASTER video and sample-aligned audio assembled; measuring loudness',flush=True)
first = subprocess.run([ffmpeg,'-hide_banner','-i',str(mix_wav),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
(logs/'loudness-pass1.log').write_text(first.stderr,encoding='utf-8')
measurement = json.loads(first.stderr[first.stderr.rfind('{'):first.stderr.rfind('}')+1])
mix = f'loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={measurement["input_i"]}:measured_TP={measurement["input_tp"]}:measured_LRA={measurement["input_lra"]}:measured_thresh={measurement["input_thresh"]}:offset={measurement["target_offset"]}:linear=true:print_format=json'
final = output / 'DO-WELL-UMAK-2026-FINAL.mp4'
with (logs/'final-mix.log').open('w') as log:
    subprocess.run([ffmpeg,'-hide_banner','-y','-i',str(master),'-i',str(mix_wav),'-map','0:v:0','-map','1:a:0','-af',mix,'-vf','scale=in_range=pc:out_range=tv,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-profile:v','high','-color_range','tv','-colorspace','bt470bg','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(data['duration']),'-movflags','+faststart',str(final)],check=True,stdout=log,stderr=subprocess.STDOUT)
subprocess.run([sys.executable,str(base/'scripts'/'validate-output.py'),'--ffprobe',ffprobe,'--video',str(final),'--report',str(output/'technical-qa.json')],check=True)
print(f'FINAL TECHNICAL QA PASSED: {final}',flush=True)
state['final']=str(final)
state['technicalQA']='passed; editorial/audio/visual review still required'
state_path.write_text(json.dumps(state,indent=2),encoding='utf-8')
