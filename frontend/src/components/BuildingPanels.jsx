import {useEffect,useRef} from 'react';
import {ArrowUpRight,Bookmark,Building2,Compass,Globe2,MapPin,Plus,Users} from 'lucide-react';
import {Panel} from './Panel';
import {Button} from './ui/button';
import {TokenLogo} from './WorldPanels';
export const BuildingPreview=({kind,scene,small=false})=>{
  const ref=useRef(null);
  useEffect(()=>{const canvas=ref.current,texture=scene?.current?.textures?.get(kind)?.getSourceImage();if(!canvas||!texture)return;
    canvas.width=small?100:300;canvas.height=small?100:180;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    const scale=Math.min((canvas.width-20)/texture.width,(canvas.height-14)/texture.height);c.drawImage(texture,(canvas.width-texture.width*scale)/2,canvas.height-texture.height*scale-7,texture.width*scale,texture.height*scale);
  },[kind,scene,small]);
  return <canvas ref={ref} className={small?'building-preview small':'building-preview'} data-testid={small?'building-thumbnail':'building-interior-preview'} aria-label={`${kind} native pixel-art building`}/>;
};
export const BuildingPanels=({panel,setPanel,building,worlds,places,savePlace,scene,setSelected})=>{
  const close=()=>setPanel(null);
  return <>
    <Panel open={panel==='hq'} onClose={close} title="Kingcom Headquarters" subtitle="The meeting point of an internet civilization." id="headquarters">
      <BuildingPreview kind="hq" scene={scene}/><div className="hq-stats" data-testid="capital-statistics"><span><strong>{worlds.length}</strong><small>Territories</small></span><span><strong>{worlds.reduce((a,w)=>a+w.citizens,0)}</strong><small>Citizens</small></span><span><strong>{worlds.reduce((a,w)=>a+w.points,0)}</strong><small>Community progress</small></span></div>
      <div className="interior-links">{[[Compass,'Explore communities','explore'],[Plus,'Register a territory','create'],[Users,'Community Hall','leaderboard'],[Bookmark,'Collection Hall','collection']].map(([Icon,label,id])=><button key={id} data-testid={`hq-${id}`} onClick={()=>setPanel(id)}><Icon size={18}/>{label}<ArrowUpRight size={15}/></button>)}</div>
    </Panel>
    <Panel open={panel==='place'&&!!building} onClose={close} title={building?.name||'A place in Kingcom'} subtitle={building?.category||'A native part of the shared continent.'} id="building-interior">
      {building&&<><BuildingPreview kind={building.kind} scene={scene}/><div className="place-address" data-testid="building-address"><MapPin size={15}/>{building.x.toLocaleString()}, {building.y.toLocaleString()}<span>Kingcom continent</span></div><Button className="full-button" data-testid="interior-save-place" onClick={()=>savePlace(building)}><Bookmark size={16}/>{places.some(p=>p.place_key===building.place_key)?'Saved to Collection Hall':'Save this place'}</Button><button className="interior-world-link" data-testid="interior-explore-link" onClick={()=>setPanel('explore')}><Globe2 size={15}/>Discover community territories<ArrowUpRight size={15}/></button></>}
    </Panel>
    <Panel open={panel==='news'} onClose={close} title="Meme News" subtitle="The latest updates from communities across the continent." id="news">
      <div className="news-list">{[...worlds].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).map(w=><button key={w.id} data-testid={`news-territory-${w.id}`} onClick={()=>{setSelected(w);setPanel('world');}}><TokenLogo world={w}/><span><strong>{w.name}</strong><small>{w.points} community progress · {w.citizens} citizens</small></span><ArrowUpRight size={15}/></button>)}</div>
    </Panel>
  </>;
};