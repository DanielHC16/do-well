from pathlib import Path
import json,subprocess
root=Path(__file__).resolve().parent.parent
bin=root/'tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin'
manifest=json.loads((root/'capture/edit-manifest.json').read_text())
result=[]
for entry in manifest:
    target=root/entry['edit']
    probe=json.loads(subprocess.check_output([str(bin/'ffprobe.exe'),'-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration,size','-of','json',str(target)]))
    video=probe['streams'][0]
    assert video['codec_name']=='h264' and video['width']==720 and video['height']==1600
    assert video['r_frame_rate']=='30/1' and video['pix_fmt']=='yuv420p'
    assert abs(float(probe['format']['duration'])-entry['edit_duration'])<0.05
    decoded=subprocess.run([str(bin/'ffmpeg.exe'),'-hide_banner','-loglevel','info','-threads','1','-i',str(target),'-vf','blackdetect=d=0.05:pix_th=0.1:pic_th=0.98','-threads','1','-f','null','NUL'],capture_output=True,text=True)
    assert decoded.returncode==0,decoded.stderr
    assert 'black_start:' not in decoded.stderr,decoded.stderr
    result.append({'name':entry['name'],'duration':probe['format']['duration'],'bytes':probe['format']['size'],'video':video,'decode':'passed','black_frames':'none'})
(root/'capture/validation.json').write_text(json.dumps(result,indent=2))
print(f'PASS: {len(result)} edited clips: H264 720x1600 30fps yuv420p, assigned durations, full decode, no black intervals.')
