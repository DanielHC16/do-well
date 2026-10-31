import React,{useEffect,useState} from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import data from './data.json';
import './style.css';

type Beat = {
  at:number; kind:string; kicker:string; title:string; body:string; unit?:string;
  secondary?:string; secondaryLabel?:string; source?:string; note?:string;
  clip?:string; clipOffset?:number; step?:number; cue?:number; items?:string[];
};
type Shot = Beat & {from:number; frames:number; chapter:number; clipFrames?:number; trim?:number; playbackRate?:number};
const palette={navy:'#1E1B4A',purple:'#7955CF',lavender:'#EEEAFB',bg:'#F8F7FC',mint:'#A7E8D4',muted:'#6B6880'};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

const Background:React.FC<{dark:boolean;chapter:number}>=({dark,chapter})=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:dark?palette.navy:palette.bg,overflow:'hidden'}}>
  <svg width="1920" height="1080" style={{position:'absolute',opacity:dark?.22:.1}}>
   <defs><pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill={dark?'#EEEAFB':palette.purple}/></pattern></defs>
   <rect width="1920" height="1080" fill="url(#grid)"/>
   <g transform={`translate(${1420+Math.sin(f/210)*28},${440+Math.cos(f/240)*24}) rotate(${chapter*12+f/90})`} fill="none" stroke={dark?palette.mint:palette.purple}>
    <circle r="490" strokeWidth="1"/><circle r="410" strokeWidth="1"/><circle r="330" strokeWidth="1"/>
    <path d="M-490 0H490 M0-490V490" strokeDasharray="4 15"/>
   </g>
  </svg>
  <div style={{position:'absolute',width:650,height:650,borderRadius:'50%',right:-240,top:-380,background:dark?palette.purple:palette.lavender,opacity:.4}}/>
 </AbsoluteFill>;
};

const Eyebrow:React.FC<{children:React.ReactNode;dark?:boolean}>=({children,dark})=><div style={{fontSize:23,fontWeight:700,letterSpacing:4,color:dark?palette.mint:palette.purple,marginBottom:28,textTransform:'uppercase'}}>{children}</div>;

const Workflow:React.FC<{active?:number;dark?:boolean;labels?:string[]}>=({active=0,dark,labels=['Discover','Apply','Select','Submit','Approve']})=>{
 const f=useCurrentFrame();
 return <div style={{display:'flex',alignItems:'center',gap:18,marginTop:44}}>{labels.map((t,i)=><React.Fragment key={t}>
  {i>0?<div style={{width:34,height:2,background:dark?'#ffffff40':'#1E1B4A30'}}/>:null}
  <div style={{opacity:interpolate(f,[i*8,i*8+16],[0,1],clamp),padding:'19px 24px',borderRadius:16,background:i<=active?palette.mint:dark?'#ffffff15':palette.lavender,color:i<=active?palette.navy:dark?'white':palette.navy,fontSize:25,fontWeight:700}}>{t}</div>
 </React.Fragment>)}</div>;
};

const Phone:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 const enter=spring({frame:f,fps:30,config:{damping:25,stiffness:90}});
 const duration=shot.clipFrames??shot.frames;
 return <div style={{position:'absolute',left:1300,top:66,width:438,height:948,transform:`translateY(${(1-enter)*45}px) rotate(${(1-enter)*2}deg)`,opacity:enter}}>
  <div style={{position:'absolute',inset:-14,borderRadius:47,border:'2px solid #C8C1E3',background:'#27233F',boxShadow:'0 24px 52px #1E1B4A28'}}/>
  <div style={{position:'absolute',inset:0,borderRadius:34,overflow:'hidden',background:palette.bg}}>
   {shot.clip?<Freeze frame={Math.min(f,Math.max(0,duration-3))}>
     <OffthreadVideo muted src={staticFile(`${data.footageDirectory}/${shot.clip}.mp4`)} trimBefore={shot.trim??0} playbackRate={shot.playbackRate??1} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
   </Freeze>:null}
  </div>
  <div style={{position:'absolute',right:-42,top:85,width:5,height:64,borderRadius:4,background:palette.navy}}/>
 </div>;
};

const Stat:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 const n=interpolate(f,[8,65],[0,5.9],clamp);
 return <div style={{position:'absolute',left:112,top:213,right:120}}>
  <Eyebrow dark>{shot.kicker}</Eyebrow>
  <div style={{display:'flex',alignItems:'baseline',gap:40}}><span style={{fontSize:252,fontWeight:700,letterSpacing:-12,color:palette.mint,lineHeight:1.05,fontVariantNumeric:'tabular-nums'}}>{n.toFixed(2)}</span><span style={{fontSize:54,fontWeight:700,letterSpacing:8}}>MILLION</span></div>
  <div style={{fontSize:49,lineHeight:1.3,maxWidth:1100,marginTop:30}}>{shot.body}</div>
  <div style={{display:'flex',gap:7,marginTop:49}}>{Array.from({length:50},(_,i)=><div key={i} style={{height:8,width:22,background:i<interpolate(f,[8,65],[0,50],clamp)?palette.mint:'#ffffff25',borderRadius:5}}/>)}</div>
 </div>;
};

const Comparison:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 return <div style={{position:'absolute',left:112,top:210,right:112}}>
  <Eyebrow dark>{shot.kicker}</Eyebrow>
  <div style={{display:'flex',gap:70,marginTop:35}}>{[{v:shot.title,t:shot.body},{v:shot.secondary,t:shot.secondaryLabel}].map((x,i)=><div key={i} style={{width:750,borderTop:`2px solid ${i?palette.purple:palette.mint}`,paddingTop:35,transform:`translateY(${(1-spring({frame:f-i*10,fps:30,config:{damping:25}}))*35}px)`}}><div style={{fontSize:170,fontWeight:700,color:i?'white':palette.mint,letterSpacing:-8}}>{x.v}</div><div style={{fontSize:37}}>{x.t}</div><div style={{fontSize:22,color:'#DDD6F0',marginTop:24}}>{i?'Share of the labor force':'Share of employed people'}</div></div>)}</div>
 </div>;
};

const People:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 return <div style={{position:'absolute',inset:0}}>
  <div style={{position:'absolute',left:112,top:202}}><Eyebrow>{shot.kicker}</Eyebrow><h1 style={{fontSize:96,lineHeight:1.02,letterSpacing:-4,margin:0,whiteSpace:'pre-line'}}>{shot.title}</h1></div>
  <div style={{position:'absolute',left:115,top:530,display:'flex',gap:40}}>{[{name:'A worker',line:'Time and skills to offer',icon:'W'},{name:'A small business',line:'A task that needs attention',icon:'E'}].map((x,i)=><div key={x.name} style={{width:730,background:i?palette.navy:'white',color:i?'white':palette.navy,borderRadius:26,padding:40,display:'flex',alignItems:'center',gap:30,transform:`translateY(${Math.sin(f/65+i)*4}px)`}}><div style={{width:94,height:94,borderRadius:24,display:'flex',justifyContent:'center',alignItems:'center',fontSize:43,fontWeight:700,background:i?palette.mint:palette.lavender,color:palette.navy}}>{x.icon}</div><div><div style={{fontSize:36,fontWeight:700}}>{x.name}</div><div style={{fontSize:28,marginTop:8,opacity:.8}}>{x.line}</div></div></div>)}</div>
 </div>;
};

const Reveal:React.FC<{shot:Shot;credits:boolean}>=({shot,credits})=>{
 const f=useCurrentFrame();
 const p=spring({frame:f,fps:30,config:{damping:23,stiffness:75}});
 return <div style={{position:'absolute',inset:0,textAlign:'center'}}>
  <div style={{position:'absolute',top:credits?100:140,left:0,right:0}}><Eyebrow dark>{shot.kicker}</Eyebrow></div>
  <Img src={staticFile('brand/logo.png')} style={{position:'absolute',left:credits?255:320,top:credits?222:290,width:credits?260:320,height:credits?260:320,borderRadius:34,transform:`scale(${.8+p*.2})`}}/>
  <div style={{position:'absolute',left:credits?575:700,top:credits?238:310,textAlign:'left',opacity:p,transform:`translateX(${(1-p)*60}px)`}}>
   <div style={{fontSize:146,lineHeight:1,fontWeight:700,letterSpacing:-7}}>DO WELL<span style={{color:palette.mint}}>.</span></div>
   <div style={{fontSize:39,marginTop:25}}>Find nearby work. Get it done well.</div>
  </div>
  {credits?<><div style={{position:'absolute',top:573,left:100,right:100,fontSize:31,lineHeight:1.8}}>Daniel Hardy Camacho <span style={{color:palette.mint}}>·</span> Hershey Anne P. Dalangin <span style={{color:palette.mint}}>·</span> Carla R. Mabutas<br/><span style={{fontSize:26,color:'#DDD6F0'}}>UMAK IT Skills Olympics 2026 · Android App · Productivity Category</span></div><div style={{position:'absolute',top:758,left:200,right:200,fontSize:18,lineHeight:1.6,color:'#DDD6F0'}}>Research: PSA August 2026 LFS (7 Oct 2026), CC BY 4.0 · PIDS PN2025-15<br/>Original synthesized narration · Recorded on Android from the live Do Well app<br/>Narration voices: Kokoro-82M (af_heart, am_michael), Apache-2.0<br/>Score: original procedural composition · Source URLs and full notices: accompanying manifest</div></>:<div style={{position:'absolute',top:727,left:0,right:0,fontSize:24,letterSpacing:6,color:palette.mint}}>OPPORTUNITY → COMPLETION</div>}
 </div>;
};

const Criteria:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 const a=['Innovation','Android','Security','Functionality','User experience'];
 return <div style={{position:'absolute',left:112,top:195,right:112}}><Eyebrow dark>{shot.kicker}</Eyebrow><h1 style={{fontSize:96,margin:'0 0 60px',lineHeight:1.1,letterSpacing:-3}}>{shot.title}</h1><div style={{display:'flex',gap:22}}>{a.map((x,i)=><div key={x} style={{flex:1,borderTop:`3px solid ${palette.mint}`,padding:'30px 18px',opacity:interpolate(f,[i*7,i*7+15],[0,1],clamp),background:'#ffffff0D',borderRadius:'0 0 14px 14px'}}><div style={{fontSize:23,color:palette.mint,marginBottom:30}}>0{i+1}</div><div style={{fontSize:32,fontWeight:700}}>{x}</div></div>)}</div></div>;
};

const AndroidGrid:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 return <div style={{position:'absolute',left:112,top:195,right:112}}><Eyebrow dark>{shot.kicker}</Eyebrow><h1 style={{fontSize:96,margin:'0 0 56px',lineHeight:1.06,letterSpacing:-3,whiteSpace:'pre-line'}}>{shot.title}</h1><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:22}}>{(shot.items??[]).map((x,i)=><div key={x} style={{borderLeft:`4px solid ${palette.mint}`,padding:'26px 26px',background:'#ffffff0D',borderRadius:'0 14px 14px 0',opacity:interpolate(f,[i*6,i*6+14],[0,1],clamp),transform:`translateY(${interpolate(f,[i*6,i*6+14],[18,0],clamp)}px)`}}><div style={{fontSize:21,color:palette.mint,marginBottom:12}}>0{i+1}</div><div style={{fontSize:33,fontWeight:700,lineHeight:1.2}}>{x}</div></div>)}</div></div>;
};

const ShotView:React.FC<{shot:Shot}>=({shot})=>{
 const f=useCurrentFrame();
 const dark=['hook','stat','comparison','reveal','disclosure','payment','identities','criteria','closing','credits','pillars','android'].includes(shot.kind);
 const enter=interpolate(f,[0,17],[0,1],clamp);
 const leave=interpolate(f,[shot.frames-10,shot.frames],[1,0],clamp);
 const phone=shot.kind==='phone';
 return <AbsoluteFill style={{color:dark?'white':palette.navy,fontFamily:'Outfit'}}>
  <Background dark={dark} chapter={shot.chapter}/>
  <AbsoluteFill style={{opacity:enter*leave}}>
   {shot.kind==='stat'?<Stat shot={shot}/>:shot.kind==='comparison'?<Comparison shot={shot}/>:shot.kind==='people'?<People shot={shot}/>:shot.kind==='reveal'||shot.kind==='credits'?<Reveal shot={shot} credits={shot.kind==='credits'}/>:shot.kind==='criteria'?<Criteria shot={shot}/>:shot.kind==='android'?<AndroidGrid shot={shot}/>:<>
    <div style={{position:'absolute',left:112,top:phone?220:235,width:phone?1080:1690,transform:`translateY(${(1-enter)*22}px)`}}>
     <Eyebrow dark={dark}>{shot.kicker}</Eyebrow>
     <h1 style={{fontSize:phone?94:shot.kind==='hook'?132:105,lineHeight:1.06,letterSpacing:-4,margin:0,fontWeight:700,whiteSpace:'pre-line',maxWidth:phone?1100:1550}}>{shot.title}</h1>
     <div style={{marginTop:40,fontSize:phone?34:39,lineHeight:1.45,whiteSpace:'pre-line',maxWidth:phone?1050:1500,color:dark?'#E2DDF3':palette.muted}}>{shot.body}</div>
     {shot.kind==='pillars'?<Workflow active={4} dark/>:null}
     {phone?<div style={{marginTop:8}}><Workflow labels={['Post','Apply','Select','Submit','Approve']} active={shot.step??0}/></div>:null}
     {shot.kind==='questions'?<div style={{display:'flex',gap:20,position:'absolute',left:1000,top:0}}>{['01','02','03'].map((x,i)=><div key={x} style={{height:260,width:150,marginTop:i*90,borderRadius:26,background:i===1?palette.navy:palette.lavender,color:i===1?'white':palette.purple,fontSize:70,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{x}</div>)}</div>:null}
    </div>
    {phone?<Phone shot={shot}/>:null}
   </>}
   {shot.note&&shot.kind!=='credits'?<div style={{position:'absolute',left:112,bottom:198,maxWidth:phone?1050:1640,fontSize:23,lineHeight:1.4,color:dark?'#D8D1EE':palette.muted,borderLeft:`3px solid ${palette.purple}`,paddingLeft:20}}>{shot.note}</div>:null}
   {shot.source?<div style={{position:'absolute',left:112,bottom:183,fontSize:20,color:dark?'#D8D1EE':palette.muted}}>{shot.source}<div style={{fontSize:16,marginTop:5}}>Original graphic adapted from the source · full citations in source manifest</div></div>:null}
  </AbsoluteFill>
  <div style={{position:'absolute',left:112,top:65,fontSize:26,fontWeight:700,letterSpacing:3,color:dark?'white':palette.navy}}>DO WELL<span style={{color:dark?palette.mint:palette.purple}}> / </span><span style={{fontWeight:400,fontSize:19,letterSpacing:2}}>OPPORTUNITY TO COMPLETION</span></div>
  {phone?<div style={{position:'absolute',right:180,top:24,fontSize:18,fontWeight:700,color:palette.navy,letterSpacing:2}}>LIVE ANDROID APP</div>:null}
  <div style={{position:'absolute',left:112,bottom:36,color:dark?'#C7BFDF':palette.muted,fontSize:17,letterSpacing:2}}>UMAK IT SKILLS OLYMPICS 2026 <span style={{marginLeft:45}}> {String(shot.chapter+1).padStart(2,'0')} / {data.chapters.length}</span></div>
  <div style={{position:'absolute',bottom:0,left:0,width:1920*(shot.from+f)/(data.duration*30),height:5,background:dark?palette.mint:palette.purple}}/>
 </AbsoluteFill>;
};

const Captions:React.FC=()=>{
 const f=useCurrentFrame();
 const c=data.captions.find(x=>f>=x.from&&f<x.to);
 const onPhone=data.shots.some(x=>x.kind==='phone'&&f>=x.from&&f<x.from+x.frames);
 if(!c)return null;
 return <div style={{position:'absolute',left:100,bottom:77,width:onPhone?1085:1720,display:'flex',justifyContent:'center'}}><div style={{fontFamily:'Outfit',fontSize:30,lineHeight:1.4,textAlign:'center',color:'white',background:'rgba(17,15,42,.94)',padding:'13px 25px',borderRadius:12,maxWidth:onPhone?1050:1600}}>{c.text}</div></div>;
};

export const Film:React.FC=()=>{
 const [fontHandle]=useState(()=>delayRender('Load locally licensed Outfit fonts'));
 useEffect(()=>{
  Promise.all([new FontFace('Outfit',`url("${staticFile('brand/Outfit-Regular.ttf')}")`,{weight:'400'}).load(),new FontFace('Outfit',`url("${staticFile('brand/Outfit-Bold.ttf')}")`,{weight:'700'}).load()]).then(fonts=>{fonts.forEach(font=>document.fonts.add(font));continueRender(fontHandle);}).catch(cancelRender);
 },[fontHandle]);
 return <AbsoluteFill style={{background:palette.navy}}>
  {data.shots.map((shot,i)=><Sequence key={i} name={`${shot.chapter+1} · ${shot.kind} · ${shot.kicker}`} from={shot.from} durationInFrames={shot.frames}><ShotView shot={shot}/></Sequence>)}
  {data.audioReady?data.chapters.map(c=><Sequence key={c.id} name={`Narration: ${c.id}`} from={Math.round(c.start*30)} durationInFrames={Math.round(c.duration*30)}><Audio src={staticFile(`audio/${c.id}.wav`)}/></Sequence>):null}
  {data.musicReady?<Audio src={staticFile('audio/music.wav')} volume={.8}/>:null}
  <Captions/>
 </AbsoluteFill>;
};
