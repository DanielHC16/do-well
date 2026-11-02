from pathlib import Path
import subprocess,json
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent.parent
bin=root/'tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin'
thumb=root/'capture/thumbs'
thumb.mkdir(exist_ok=True)
metadata={}
for source in sorted((root/'public/footage').glob('*.mp4')):
    probe=json.loads(subprocess.check_output([str(bin/'ffprobe.exe'),'-v','error','-show_entries','format=duration','-of','json',str(source)]))
    duration=float(probe['format']['duration'])
    metadata[source.stem]={'duration':duration}
    out=thumb/(source.stem+'-%03d.jpg')
    subprocess.run([str(bin/'ffmpeg.exe'),'-hide_banner','-loglevel','error','-y','-i',str(source),'-vf','fps=1/5,scale=180:400','-threads','1',str(out)],check=True)
    frames=sorted(thumb.glob(source.stem+'-*.jpg'))
    sheet=Image.new('RGB',(180*len(frames),428),'#dddddd')
    draw=ImageDraw.Draw(sheet)
    for i,frame in enumerate(frames):
        sheet.paste(Image.open(frame),(180*i,28))
        draw.text((180*i+5,8),f'{source.stem} {i*5+2.5:.1f}s',fill='black')
    sheet.save(root/'capture'/(source.stem+'-contact.jpg'))
(root/'capture/raw-metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps(metadata,indent=2))
