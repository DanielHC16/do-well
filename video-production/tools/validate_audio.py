"""Check actual PCM files, cue bounds, peaks and unintended long silences."""
from pathlib import Path
import json
import math
import wave
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
script=json.loads((ROOT/'script.json').read_text(encoding='utf-8-sig'))
results=[]
for chapter in script['chapters']:
    identifier=chapter['id']
    metadata=json.loads((ROOT/'audio'/f'{identifier}.json').read_text(encoding='utf-8'))
    with wave.open(str(ROOT/'public/audio'/f'{identifier}.wav'),'rb') as wav:
        assert wav.getnchannels()==1 and wav.getsampwidth()==2
        rate=wav.getframerate()
        samples=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float32)/32768
    duration=len(samples)/rate
    assert abs(duration-metadata['duration'])<0.001
    assert len(metadata['cues'])>=1
    assert all(0<=cue['start']<cue['end']<=duration for cue in metadata['cues'])
    peak=float(np.max(np.abs(samples)))
    assert 0.1<peak<0.95
    block_size=int(rate*0.1)
    blocks=samples[:len(samples)//block_size*block_size].reshape(-1,block_size)
    quiet=np.sqrt(np.mean(blocks*blocks,axis=1))<0.00316
    longest=run=0
    for silence in quiet:
        run=run+1 if silence else 0
        longest=max(run,longest)
    longest*=0.1
    assert longest<2.0,(identifier,'Unexpected long silence',longest)
    rms=float(np.sqrt(np.mean(samples*samples)))
    results.append({'id':identifier,'duration':round(duration,4),'peakDBFS':round(20*math.log10(peak),2),'rmsDBFS':round(20*math.log10(rms),2),'longestSilenceSeconds':round(longest,2),'cueCount':len(metadata['cues']),'pass':True})
report={'chapters':results,'narrationSeconds':round(sum(x['duration'] for x in results),4),'passed':True,'limits':'Signal, timing and file verification; does not constitute subjective listening review.'}
(ROOT/'audio/audio-qa.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
