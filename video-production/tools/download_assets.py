"""Download only public, explicitly licensed production dependencies locally."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
ASSETS = {
    'ffmpeg.zip': 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip',
    'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
    'config.json': 'https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/src/kokoro_onnx/config.json',
    'kokoro_config.py': 'https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/src/kokoro_onnx/config.py',
    'KOKORO-ONNX-LICENSE.txt': 'https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/LICENSE',
    'mms-onnx-tgl/model.onnx': 'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/4f49fc254f11ddb0e35fbf25b6e48b04463a6779/tgl/model.onnx',
    'mms-onnx-tgl/tokens.txt': 'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/4f49fc254f11ddb0e35fbf25b6e48b04463a6779/tgl/tokens.txt',
}
KNOWN_SHA256 = {
    'kokoro-v1.0.onnx': '7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5',
    'voices-v1.0.bin': 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d',
    'mms-onnx-tgl/model.onnx': 'f0594f259f7016a0ff00d5e72886f946e6ed6ae8edf1d9e78649f24d59c83ffb',
}

def download(item):
    name, url = item
    target = ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with urllib.request.urlopen(url, timeout=120) as response, target.with_suffix(target.suffix+'.part').open('wb') as out:
            while chunk := response.read(1024*1024):
                out.write(chunk)
        target.with_suffix(target.suffix+'.part').replace(target)
    hasher=hashlib.sha256()
    with target.open('rb') as source:
        while chunk:=source.read(1024*1024):
            hasher.update(chunk)
    digest=hasher.hexdigest()
    if name in KNOWN_SHA256 and digest!=KNOWN_SHA256[name]:
        raise ValueError(f'Asset checksum mismatch: {name}')
    print(json.dumps({'file':name,'bytes':target.stat().st_size,'sha256':digest}),flush=True)
    if name.endswith('.zip'):
        with zipfile.ZipFile(target) as archive:
            archive.extractall(ROOT / 'ffmpeg')
    return {'file':name,'url':url,'sha256':digest}

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(download, ASSETS.items()))
    (ROOT / 'asset-downloads.json').write_text(json.dumps(results,indent=2))
