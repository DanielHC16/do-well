from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import urllib.request
import time

REVISION='79182edde3d60484a9e7a666240917f454138a0b'
TARGET=Path(__file__).resolve().parent / 'mms-tts-tgl'
FILES=['README.md','config.json','special_tokens_map.json','tokenizer_config.json','vocab.json']

def fetch(name):
    TARGET.mkdir(exist_ok=True)
    file=TARGET/name
    if name == 'model.safetensors' and file.exists() and file.stat().st_size != 145231352:
        file.replace(file.with_suffix('.part'))
    if not file.exists():
        partial=file.with_suffix(file.suffix+'.part')
        url=f'https://huggingface.co/facebook/mms-tts-tgl/resolve/{REVISION}/{name}'
        for attempt in range(4):
            try:
                offset=partial.stat().st_size if partial.exists() else 0
                request=urllib.request.Request(url,headers={'Range':f'bytes={offset}-'} if offset else {})
                with urllib.request.urlopen(request,timeout=120) as response:
                    append=response.status==206
                    expected=int(response.headers.get('Content-Length',0))+(offset if append else 0)
                    with partial.open('ab' if append else 'wb') as out:
                        while data:=response.read(1024*1024):
                            out.write(data)
                if expected and partial.stat().st_size!=expected:
                    raise ValueError('Incomplete model download')
                partial.replace(file)
                break
            except Exception:
                if attempt==3:
                    raise
                time.sleep(1)
    print(name,file.stat().st_size,flush=True)

with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(fetch,FILES))
