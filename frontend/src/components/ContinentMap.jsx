import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import { biomeAt, CENTER, WORLD_SIZE, LANDMARKS } from '../game/geography';
import { capturePointer } from '../lib/pointer';

const colors={grass:'#95ab7f',forest:'#587e65',desert:'#d9bd85',beach:'#dcd0a5',water:'#71a6ac',ocean:'#63939f',mountain:'#939b90'};
let terrainCache;
function overview(){
  if(terrainCache)return terrainCache;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){c.fillStyle=colors[biomeAt(x*128,y*128)];c.fillRect(x,y,1,1);}
  terrainCache=canvas;return canvas;
}

export const ContinentMap = ({worlds,position,discovered=[],mini=false,onTerritory,onCapital}) => {
  const ref=useRef(null),drag=useRef(null);
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:CENTER,y:CENTER});
  const transform=useRef({});
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const width=mini?200:620,height=mini?140:410;canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const scale=mini?width/10000:Math.min(width,height)/(WORLD_SIZE/zoom);
    const center=mini?position:pan;
    const px=x=>(x-center.x)*scale+width/2,py=y=>(y-center.y)*scale+height/2;
    transform.current={scale,center,width,height,px,py};
    ctx.fillStyle='#63939f';ctx.fillRect(0,0,width,height);
    ctx.drawImage(overview(),px(0),py(0),WORLD_SIZE*scale,WORLD_SIZE*scale);
    // The map is a geographic overview of the same procedural continent, not a separate level.
    ctx.strokeStyle='#b9bba0';ctx.lineWidth=mini?1:2;
    ctx.beginPath();for(let x=0;x<=WORLD_SIZE;x+=256){const y=CENTER+590+Math.sin((x-CENTER)/2400)*100;x?ctx.lineTo(px(x),py(y)):ctx.moveTo(px(x),py(y));}ctx.stroke();
    ctx.beginPath();for(let y=0;y<=WORLD_SIZE;y+=256){const x=CENTER+1920+Math.sin((y-CENTER)/2900)*160;y?ctx.lineTo(px(x),py(y)):ctx.moveTo(px(x),py(y));}ctx.stroke();
    if(!mini){ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#40594f';LANDMARKS.filter(l=>zoom>2?l.id!=='capital':['desert','mountain','forest'].includes(l.id)).forEach(l=>{ctx.fillText(l.name.toUpperCase(),px(l.x),py(l.y));});}
    worlds.forEach(w=>{
      const x=px(w.center_x),y=py(w.center_y),known=discovered.includes(w.id),radius=Math.max(mini?4:5,620*scale);
      ctx.fillStyle=['#cf835f','#b395b9','#8ebdb2','#bed095'][w.region%4];ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
      ctx.strokeStyle=known?'#fff3c6':'#44604d';ctx.lineWidth=1;ctx.strokeRect(x-radius-1,y-radius-1,radius*2+2,radius*2+2);
      if(!mini){ctx.fillStyle='#253c35';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(`$${w.symbol}`,x,y-radius-5);}
    });
    const hx=px(CENTER),hy=py(CENTER);ctx.fillStyle='#f1cc68';ctx.fillRect(hx-6,hy-6,12,12);ctx.strokeStyle='#725b2e';ctx.strokeRect(hx-7,hy-7,14,14);
    if(!mini){ctx.fillStyle='#243e35';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('KINGCOM',hx,hy-12);}
    const ax=px(position.x),ay=py(position.y);ctx.fillStyle='#fff9db';ctx.fillRect(ax-3,ay-3,6,6);ctx.strokeStyle='#2f4e45';ctx.strokeRect(ax-4,ay-4,8,8);
    if(!mini){ctx.strokeStyle='#314d4855';ctx.lineWidth=1;ctx.strokeRect(ax-1000*scale,ay-500*scale,2000*scale,1000*scale);}
  },[worlds,position,discovered,mini,zoom,pan]);
  const pointer=(e)=>{const r=ref.current.getBoundingClientRect();return {x:(e.clientX-r.left)*ref.current.width/r.width,y:(e.clientY-r.top)*ref.current.height/r.height};};
  const click=e=>{
    if(mini||drag.current?.moved)return;const p=pointer(e),t=transform.current;
    const nearest=worlds.find(w=>Math.hypot(t.px(w.center_x)-p.x,t.py(w.center_y)-p.y)<15);
    if(nearest)onTerritory?.(nearest);else if(Math.hypot(t.px(CENTER)-p.x,t.py(CENTER)-p.y)<16)onCapital?.();
  };
  return <div className={mini?'continent-mini':'continent-map'}>
    <canvas ref={ref} data-testid={mini?'minimap-canvas':'continent-map-canvas'} aria-label={mini?'Nearby continent, territories and your position':'The entire Kingcom continent with community territories and major geographical regions'}
      onClick={click} onPointerDown={e=>{if(mini)return;drag.current={...pointer(e),pan,moved:false};capturePointer(e);}}
      onPointerMove={e=>{if(mini||!drag.current)return;const p=pointer(e),d=drag.current,scale=transform.current.scale;if(Math.hypot(p.x-d.x,p.y-d.y)>4){d.moved=true;setPan({x:d.pan.x-(p.x-d.x)/scale,y:d.pan.y-(p.y-d.y)/scale});}}}
      onPointerUp={()=>{setTimeout(()=>{drag.current=null;},0);}} onPointerCancel={()=>{drag.current=null;}}/>
    {!mini&&<><span className="map-scale" data-testid="map-scale-label">{Math.round(10000/zoom).toLocaleString()} world units <i/></span><div className="continent-map-controls"><button data-testid="overview-zoom-in" aria-label="Zoom world map in" onClick={()=>setZoom(z=>Math.min(8,z+.5))}><Plus size={15}/></button><button data-testid="overview-zoom-out" aria-label="Zoom world map out" onClick={()=>setZoom(z=>Math.max(1,z-.5))}><Minus size={15}/></button><button data-testid="overview-locate-player" aria-label="Find your position" onClick={()=>{setPan(position);setZoom(4);}}><LocateFixed size={15}/></button></div><span className="map-north">N ↑</span></>}
  </div>;
};