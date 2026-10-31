"""Offline scene narration. No paid services, tokens, or external inference.

Usage: tools/venv/Scripts/python.exe tools/generate_narration.py script.json
Input: an array or {chapters:[{id,start,duration,narration,language?}]}.
English uses Kokoro-82M/af_heart (Apache-2.0). Tagalog uses Meta MMS
CC-BY-NC 4.0 for this noncommercial educational competition presentation.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import time
import wave
import numpy as np

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
OUT = ROOT / 'public' / 'audio'
META = ROOT / 'audio'


def validate(data):
    scenes = data if isinstance(data, list) else data.get('chapters', data.get('scenes', []))
    if not isinstance(scenes, list) or not scenes:
        raise ValueError('Expected nonempty chapters array')
    for scene in scenes:
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,64}', scene.get('id', '')):
            raise ValueError('Unsafe or absent chapter id')
        if not isinstance(scene.get('narration'), str) or not scene['narration'].strip():
            raise ValueError('Expected narration text')
        if len(scene['narration']) > 15000:
            raise ValueError('Narration exceeds scene text budget')
    return scenes


def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ü0-9])', text) if s.strip()]


def english_engine():
    import onnxruntime as ort
    from piper.phonemize_espeak import EspeakPhonemizer
    from kokoro_config import DEFAULT_VOCAB
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(TOOLS/'kokoro-v1.0.onnx'), options, providers=['CPUExecutionProvider'])
    voices=np.load(str(TOOLS/'voices-v1.0.bin'))
    phonemizer=EspeakPhonemizer()
    class NativeKokoro:
        """Same documented Kokoro ONNX graph, using already-installed espeak-ng.

        This avoids waiting on unrelated large Python packages to extract.
        Graph inputs were verified from the actual downloaded model metadata.
        """
        def create(self,text,voice,speed,lang):
            parts=[]
            for phoneme_sentence in phonemizer.phonemize(lang,text):
                phones=[p for p in phoneme_sentence if p in DEFAULT_VOCAB]
                while phones:
                    chunk=phones[:500]
                    phones=phones[500:]
                    ids=[DEFAULT_VOCAB[p] for p in chunk]
                    samples=session.run(None,{'tokens':np.array([[0,*ids,0]],dtype=np.int64),'style':voices[voice][len(ids)-1],'speed':np.array([speed],dtype=np.float32)})[0]
                    parts.append(np.asarray(samples,dtype=np.float32).ravel())
            return np.concatenate(parts),24000
    return NativeKokoro()


def tagalog_engine():
    import onnxruntime as ort
    options=ort.SessionOptions()
    options.intra_op_num_threads=2
    options.inter_op_num_threads=1
    ort.set_seed(1416)
    session=ort.InferenceSession(str(TOOLS/'mms-onnx-tgl/model.onnx'),options,providers=['CPUExecutionProvider'])
    vocab=json.loads((TOOLS/'mms-tts-tgl/vocab.json').read_text(encoding='utf-8'))
    def create(text):
        # Exact MMS tokenizer config: normalize=true, add_blank=true,
        # is_uroman=false, pad_token='a' (id0). Model metadata confirms
        # character frontend. Graph tensor names verified from actual ONNX.
        text=text.replace('2026',"dalawang libo dalawampu't anim")
        chars=[vocab[c] for c in text.lower() if c in vocab]
        ids=[0]
        for token in chars:
            ids.extend([token,0])
        return session.run(['y'],{'x':np.array([ids],dtype=np.int64),'x_length':np.array([len(ids)],dtype=np.int64),'noise_scale':np.array([0.667],dtype=np.float32),'length_scale':np.array([1.0],dtype=np.float32),'noise_scale_w':np.array([0.8],dtype=np.float32)})[0].ravel()
    return create


def clean_english(text):
    return text.replace('DO WELL','Do Well').replace('UMAK','University of Makati').replace('PHP','pesos').replace('₱','pesos ').replace('MVP','M. V. P.').replace('GPS','G. P. S.').replace('RLS','R. L. S.').replace('LLM','L. L. M.').replace('Supabase','Supa base')


def run(script, only=None, force=False,english_only=False):
    scenes=validate(json.loads(Path(script).read_text(encoding='utf-8-sig')))
    OUT.mkdir(parents=True,exist_ok=True)
    META.mkdir(parents=True,exist_ok=True)
    eng = None
    tgl = None
    manifest=[]
    for scene in scenes:
        chapter_id=scene['id']
        if only and chapter_id != only:
            continue
        language=scene.get('language',scene.get('lang','en'))
        if english_only and language in ('tl','tgl','fil'):
            continue
        voice=scene.get('voice','af_heart')
        speed=float(scene.get('speed',0.96))
        gap=float(scene.get('gap',0.32))
        # Chapters without an explicit voice keep the original cache key.
        engine_key=f'kokoro-v1-{voice}-speed{speed}-gap{gap}' if 'voice' in scene else 'kokoro-v1-af_heart-speed096-v2'
        digest=hashlib.sha256((scene['narration']+language+engine_key).encode()).hexdigest()
        target=OUT/f'{chapter_id}.wav'
        metadata=META/f'{chapter_id}.json'
        if target.exists() and metadata.exists() and not force:
            old=json.loads(metadata.read_text())
            if old.get('textSha256') == digest:
                manifest.append(old)
                print(json.dumps({'chapter':chapter_id,'cached':True,'duration':old['duration']}),flush=True)
                continue
        chunks=[]
        cues=[]
        current=0.20
        rate=24000
        chunks.append(np.zeros(int(rate*current),dtype=np.float32))
        for sentence in sentences(scene['narration']):
            if language in ('tl','tgl','fil'):
                from scipy.signal import resample_poly
                if tgl is None:
                    tgl=tagalog_engine()
                samples=tgl(sentence)
                samples=resample_poly(samples,rate,16000).astype(np.float32)
            else:
                if eng is None:
                    eng=english_engine()
                samples,source_rate=eng.create(clean_english(sentence),voice=voice,speed=speed,lang='en-us')
                assert source_rate==rate
                samples=np.asarray(samples,dtype=np.float32)
            # Retain speech but remove excessive leading/trailing silence.
            active=np.flatnonzero(np.abs(samples)>0.005)
            if active.size:
                samples=samples[max(0,int(active[0])-2400):min(len(samples),int(active[-1])+3600)]
            length=len(samples)/rate
            cues.append({'text':sentence,'start':round(current,4),'end':round(current+length,4)})
            chunks.append(samples)
            chunks.append(np.zeros(int(rate*gap),dtype=np.float32))
            current+=length+gap
        audio=np.concatenate(chunks)
        peak=float(np.max(np.abs(audio)))
        if peak>0:
            audio*=0.84/peak
        with wave.open(str(target),'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(rate)
            wav.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
        details={'id':chapter_id,'file':f'audio/{chapter_id}.wav','duration':round(len(audio)/rate,4),'sampleRate':rate,'language':language,'engine':'Meta MMS Tagalog / CC-BY-NC-4.0' if language in ('tl','tgl','fil') else f'Kokoro-82M v1.0 {voice} / Apache-2.0','textSha256':digest,'cues':cues}
        metadata.write_text(json.dumps(details,ensure_ascii=False,indent=2),encoding='utf-8')
        manifest.append(details)
        print(json.dumps({'chapter':chapter_id,'duration':details['duration'],'allocation':scene.get('duration'),'file':str(target)}),flush=True)
    (META/'narration-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('script')
    parser.add_argument('--only')
    parser.add_argument('--force',action='store_true')
    parser.add_argument('--english-only',action='store_true')
    args=parser.parse_args()
    run(args.script,args.only,args.force,args.english_only)
