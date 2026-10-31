import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=JSON.parse(readFileSync(path.join(base,'script.json'),'utf8'));
const manifestPath=path.join(base,'audio','narration-manifest.json');
const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
const finalMode=process.argv.includes('--final');
const toolchainPath=path.join(base,'tools','toolchain.json');
const toolchain=existsSync(toolchainPath)?JSON.parse(readFileSync(toolchainPath,'utf8')):{};
const ffprobe=process.env.VIDEO_FFPROBE??toolchain.ffprobe;
const footageDirectory='footage/edit';
if(finalMode&&!ffprobe)throw new Error('Final preparation requires FFprobe; cannot guess media duration');
const mediaCache=new Map();
const getFrames=(clip)=>{
 const file=path.join(base,'public',footageDirectory,clip+'.mp4');
 if(mediaCache.has(clip))return mediaCache.get(clip);
 if(!existsSync(file))return null;
 if(ffprobe){
  const p=spawnSync(ffprobe,['-v','error','-show_entries','format=duration','-of','json',file],{encoding:'utf8'});
  if(p.status!==0)throw new Error(p.stderr);
  const frames=Math.floor(Number(JSON.parse(p.stdout).format.duration)*30);
  mediaCache.set(clip,frames);
  return frames;
 }
 return 30*60;
};
let cursorFrames=0;
const measured=script.chapters.map(c=>{
 const file=path.join(base,'audio',c.id+'.json');
 if(!existsSync(file))return null;
 const m=JSON.parse(readFileSync(file,'utf8'));
 const digest=createHash('sha256').update(c.narration+c.lang+(c.voice?`kokoro-v1-${c.voice}-speed${c.speed}-gap${c.gap}`:'kokoro-v1-af_heart-speed096-v2')).digest('hex');
 if(m.textSha256!==digest){if(finalMode)throw new Error(`Narration is stale for ${c.id}; regenerate it`);return null;}
 return m;
});
const allMeasured=measured.every(Boolean);
if(finalMode&&!allMeasured)throw new Error('Final preparation requires all measured narration chapters');
// pad: extra seconds of footage under music after a chapter's narration.
const chapterFrames=i=>Math.ceil((measured[i].duration+.35+(script.chapters[i].pad??0))*30);
const rawFrames=allMeasured?script.chapters.reduce((n,_,i)=>n+chapterFrames(i),0):script.duration*30;
const targetFrames=Math.max(450*30,rawFrames);
if(finalMode&&targetFrames>510*30)throw new Error(`Measured edit exceeds 8:30: ${targetFrames/30}s`);
const extraFrames=targetFrames-rawFrames;
const chapters=script.chapters.map((c,i)=>{
 const frames=allMeasured?chapterFrames(i)+(i===script.chapters.length-1?extraFrames:0):Math.round(c.duration*30);
 const start=cursorFrames/30;
 const duration=frames/30;
 cursorFrames+=frames;
 // cue: start a beat just before the measured narration sentence it illustrates.
 return {...c,start,duration,beats:c.beats.map(b=>({...b,at:b.cue!==undefined&&allMeasured?Math.max(0,measured[i].cues[b.cue].start-.25):b.at/c.duration*duration}))};
});
const shots=chapters.flatMap((c,chapter)=>c.beats.map((b,i)=>{
 const next=c.beats[i+1]?.at??c.duration;
 const sourceFrames=b.clip?getFrames(b.clip):null;
 const trim=Math.min((b.clipOffset??0)*30,Math.max(0,(sourceFrames??0)-60));
 const from=Math.round((c.start+b.at)*30);
 const end=Math.round((c.start+next)*30);
 return {...b,from,frames:end-from,chapter,clipFrames:Math.max(1,(sourceFrames??0)-trim),trim,playbackRate:1};
}));
for(let i=1;i<shots.length;i++)if(shots[i-1].from+shots[i-1].frames!==shots[i].from)throw new Error(`Timeline gap/overlap at shot ${i}`);
if(shots[0].from!==0||shots.at(-1).from+shots.at(-1).frames!==targetFrames)throw new Error('Timeline bounds do not match composition');
let captions=[];
const wrap=(text,max=75)=>{
 const words=text.split(/\s+/),chunks=[];
 for(const word of words){if(!chunks.length||chunks[chunks.length-1].length+word.length+1>max)chunks.push(word);else chunks[chunks.length-1]+=' '+word;}
 return chunks;
};
for(const c of chapters){
 const chunks=wrap(c.lang==='fil'?c.translation:c.narration);
 const total=chunks.reduce((n,s)=>n+s.length,0);
 let cursor=c.start*30+12;
 for(const text of chunks){const frames=Math.round(text.length/total*(c.duration*30-42));captions.push({from:Math.round(cursor),to:Math.round(cursor+frames),text});cursor+=frames;}
}
// Sentence timing is measured during synthesis; splitting within a sentence preserves its boundaries.
if(allMeasured){
 captions=[];
 chapters.forEach((c,i)=>{
  const translations=c.lang==='fil'?c.translation.split(/(?<=[.!?])\s+/).map(x=>x.trim()):null;
  measured[i].cues.forEach((cue,j)=>{
   const pieces=wrap(translations?.[j]??cue.text,70);
   const letters=pieces.reduce((n,s)=>n+s.length,0);
   let at=c.start+cue.start;
   for(const text of pieces){const length=(cue.end-cue.start)*text.length/letters;captions.push({from:Math.round(at*30),to:Math.round((at+length)*30),text});at+=length;}
  });
 });
}
const audioReady=chapters.every(c=>existsSync(path.join(base,'public','audio',c.id+'.wav')));
const missingFootage=[...new Set(shots.filter(s=>s.clip&&!getFrames(s.clip)).map(s=>s.clip))];
if(finalMode&&(!audioReady||missingFootage.length))throw new Error(`Missing assets: audioReady=${audioReady}, footage=${missingFootage.join(',')}`);
const data={duration:targetFrames/30,chapters,shots,captions,footageDirectory,audioReady,musicReady:existsSync(path.join(base,'public','audio','music.wav')),manifest};
mkdirSync(path.join(base,'composition','src'),{recursive:true});
writeFileSync(path.join(base,'composition','src','data.json'),JSON.stringify(data,null,2));
console.log(JSON.stringify({seconds:data.duration,shots:shots.length,captions:captions.length,measuredTiming:allMeasured,audioReady,missingFootage},null,2));
const stamp=f=>{const ms=Math.round(f/30*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
writeFileSync(path.join(base,'output','DO-WELL-UMAK-2026-EN.srt'),captions.map((c,i)=>`${i+1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n'));

// Research source manifest is copied from the reviewed research artifact verbatim.
const researchDoc=path.resolve(base,'..','docs','plans','2026-10-31-video-research.md');
if(existsSync(researchDoc)){
 const txt=readFileSync(researchDoc,'utf8');
 const json=txt.match(/```json\s*([\s\S]*?)```/);
 if(json){JSON.parse(json[1]);writeFileSync(path.join(base,'research','sources.json'),json[1]);}
}
