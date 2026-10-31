"""Normalize authentic ADB recordings, speed typing, then hold final true frame."""
from pathlib import Path
import json,subprocess
root=Path(__file__).resolve().parent.parent
bin=root/'tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin'
footage=root/'public/footage'
out=footage/'edit'
out.mkdir(exist_ok=True)
scenes={
    '01-demo-home': (0, 1, 9),
    '02-employer-create': (0, 1.5, 37),
    '03-worker-discovery': (4, 1, 19),
    '04-worker-apply': (0, 1, 35),
    '05-employer-select': (3.5, 1, 42),
    '06-worker-submit': (0, 1, 38),
    '07-employer-approve': (0, 1, 16),
    '08-activity': (0, 1, 14),
    '09-remote': (0, 1, 17),
}
manifest=[]
for name,(start,speed,duration) in scenes.items():
    src=footage/(name+'.mp4')
    probe=json.loads(subprocess.check_output([str(bin/'ffprobe.exe'),'-v','error','-show_entries','format=duration','-of','json',str(src)]))
    raw_duration=float(probe['format']['duration'])
    vf=f'trim=start={start},setpts=(PTS-STARTPTS)/{speed},fps=30,tpad=stop_mode=clone:stop_duration={duration},format=yuv420p'
    if name=='03-worker-discovery':
        # Remove the separately covered remote detour, preserving discovery then cafe details.
        vf='[0:v]split[a][b];[a]trim=start=4:end=13,setpts=PTS-STARTPTS[a1];[b]trim=start=16,setpts=PTS-STARTPTS[b1];[a1][b1]concat=n=2:v=1:a=0,fps=30,tpad=stop_mode=clone:stop_duration=19,format=yuv420p[v]'
        filter_args=['-filter_complex',vf,'-map','[v]']
    else:
        filter_args=['-vf',vf]
    cmd=[str(bin/'ffmpeg.exe'),'-hide_banner','-loglevel','error','-y','-i',str(src),*filter_args,'-t',str(duration),'-an','-c:v','libx264','-crf','19','-preset','veryfast','-threads','1','-movflags','+faststart',str(out/(name+'.mp4'))]
    subprocess.run(cmd,check=True)
    manifest.append({'name':name,'raw':str(src.relative_to(root)),'raw_duration':raw_duration,'edit':str((out/(name+'.mp4')).relative_to(root)),'trim_start':start,'omitted_source_ranges':[[13,16]] if name=='03-worker-discovery' else [],'speed':speed,'edit_duration':duration,'fps':30,'edit_policy':'Only authentic Android frames; typing accelerated only in creation; verified final true frame held, never looped.'})
(root/'capture/edit-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
