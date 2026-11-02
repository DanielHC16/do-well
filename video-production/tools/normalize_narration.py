"""Normalize each mono chapter to -19 LUFS / -3 dBTP, preserving frames."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import wave

ROOT=Path(__file__).resolve().parent.parent
FFMPEG=Path(json.loads((ROOT/'tools/toolchain.json').read_text())['ffmpeg'])
script=json.loads((ROOT/'script.json').read_text(encoding='utf-8-sig'))
backup=ROOT/'audio/raw'
backup.mkdir(exist_ok=True)
reports=[]

def analyze(path):
    result=subprocess.run([str(FFMPEG),'-hide_banner','-nostdin','-i',str(path),'-af','loudnorm=I=-19:TP=-3:LRA=7:print_format=json','-f','null','NUL'],capture_output=True,text=True,check=True)
    matches=re.findall(r'\{\s*"input_i".*?\}',result.stderr,re.DOTALL)
    if not matches:
        raise ValueError('FFmpeg loudness statistics absent')
    return json.loads(matches[-1])

for chapter in script['chapters']:
    identifier=chapter['id']
    target=ROOT/'public/audio'/f'{identifier}.wav'
    original=backup/f'{identifier}.wav'
    metadata_path=ROOT/'audio'/f'{identifier}.json'
    meta=json.loads(metadata_path.read_text(encoding='utf-8'))
    if meta.get('normalization',{}).get('targetLUFS') == -19:
        print(identifier,'already normalized',flush=True)
        continue
    shutil.copy2(target,original)
    with wave.open(str(original),'rb') as wav:
        count=wav.getnframes()
        rate=wav.getframerate()
    before=analyze(original)
    temporary=target.with_name(target.stem+'.normalizing.wav')
    filters=f'loudnorm=I=-19:TP=-3:LRA=7:linear=false,aresample={rate},apad=whole_len={count},atrim=end_sample={count}'
    subprocess.run([str(FFMPEG),'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(original),'-af',filters,'-ar',str(rate),'-ac','1','-c:a','pcm_s16le',str(temporary)],check=True)
    with wave.open(str(temporary),'rb') as wav:
        assert wav.getnframes()==count and wav.getframerate()==rate
    after=analyze(temporary)
    assert abs(float(after['input_i'])+19)<0.65,(identifier,after)
    assert float(after['input_tp'])<=-2.8,(identifier,after)
    temporary.replace(target)
    details={'targetLUFS':-19,'targetTruePeakDB':-3,'actualLUFS':float(after['input_i']),'actualTruePeakDB':float(after['input_tp']),'sampleCount':count,'preservedSampleCount':True,'rawFile':str(original.relative_to(ROOT))}
    meta['normalization']=details
    metadata_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    reports.append({'id':identifier,'before':before,'after':after,**details})
    print(json.dumps({'id':identifier,**details}),flush=True)
(ROOT/'audio/loudness-qa.json').write_text(json.dumps({'passed':True,'chapters':reports,'note':'Each chapter measured separately; final stereo mix needs independent master loudness verification.'},indent=2),encoding='utf-8')
