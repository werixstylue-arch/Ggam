import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Compass, Plus, Map, UserRound, Settings2, Wallet, Globe2, Loader2, MapPin } from 'lucide-react';
import { Toaster, toast } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { api, errorMessage, startSession } from './lib/api';
import { GameCanvas } from './game/GameCanvas';
import { SPAWN } from './game/geography';
import { WorldPanels } from './components/WorldPanels';
import { PlayerPanels } from './components/PlayerPanels';
import { BuildingPanels } from './components/BuildingPanels';
import { GameHUD } from './components/GameHUD';
import './App.css';
import './continent.css';
import './buildings.css';

export default function App(){
  const [player,setPlayer]=useState(null),[worlds,setWorlds]=useState([]),[places,setPlaces]=useState([]);
  const [panel,setPanel]=useState(null),[selected,setSelected]=useState(null),[activeWorld,setActiveWorld]=useState(null);
  const [position,setPosition]=useState(SPAWN),[location,setLocation]=useState({name:'Kingcom Kingdom',kind:'CENTRAL CAPITAL'});
  const [building,setBuilding]=useState(null),[plot,setPlot]=useState(null),[checkingLand,setCheckingLand]=useState(false);
  const [ready,setReady]=useState(false),[loadError,setLoadError]=useState(''),[busy,setBusy]=useState(false),[chunkCount,setChunkCount]=useState(0);
  const [settings,setSettings]=useState(()=>{try{return JSON.parse(localStorage.getItem('kingcom-settings'))||{map:true,labels:true};}catch{return{map:true,labels:true};}});
  const scene=useRef(null),joystick=useRef({x:0,y:0}),state=useRef({}),landRequest=useRef(0);
  state.current={player,worlds,position,panel,building,plot};
  const refreshWorlds=useCallback(async()=>{const {data}=await api.get('/worlds');setWorlds(data);return data;},[]);
  const refreshPlaces=useCallback(async()=>{setPlaces((await api.get('/places')).data);},[]);
  const initialize=useCallback(async()=>{
    setLoadError('');try{const p=await startSession();
      const [w,s]=await Promise.all([api.get('/worlds'),api.get('/places')]);setWorlds(w.data);setPlaces(s.data);setPosition({x:p.x,y:p.y});setPlayer(p);
    }catch(e){setLoadError(errorMessage(e));}
  },[]);
  useEffect(()=>{initialize();},[initialize]);
  useEffect(()=>{scene.current?.refreshWorlds(worlds);},[worlds]);
  useEffect(()=>{if(scene.current){scene.current.blocked=Boolean(panel);scene.current.drag=null;scene.current.input.keyboard.resetKeys();joystick.current={x:0,y:0};}},[panel]);
  useEffect(()=>{localStorage.setItem('kingcom-settings',JSON.stringify(settings));scene.current?.setLabels(settings.labels);},[settings,worlds]);
  useEffect(()=>{
    if(!player||!ready)return;let pending=false,stopped=false;
    const saveView=async()=>{if(pending||document.hidden)return;pending=true;try{const {data}=await api.post('/players/position',state.current.position);
      if(!stopped)setPlayer(p=>JSON.stringify(p.discovered)===JSON.stringify(data.discovered)?p:{...p,discovered:data.discovered});
    }catch{}finally{pending=false;}};
    const save=setInterval(saveView,3000),refresh=setInterval(()=>refreshWorlds().catch(()=>{}),30000);
    return()=>{stopped=true;clearInterval(save);clearInterval(refresh);};
  },[player?.id,ready,refreshWorlds]); // eslint-disable-line react-hooks/exhaustive-deps
  const inspectLand=useCallback(async point=>{
    const request=++landRequest.current;setBuilding(null);setPlot(null);setCheckingLand(true);
    try{const {data}=await api.get('/land/check',{params:point});if(request!==landRequest.current)return;setPlot(data);if(data.available){scene.current?.moveTo(data.x,data.y);scene.current?.highlightLand(data);}}
    catch(e){if(request===landRequest.current)toast.error(errorMessage(e));}finally{if(request===landRequest.current)setCheckingLand(false);}
  },[]);
  const callbacks=useMemo(()=>({
    getProfile:()=>state.current.player,getWorlds:()=>state.current.worlds,getJoystick:()=>joystick.current,
    onReady:s=>{scene.current=s;setReady(true);},onChunks:setChunkCount,
    onPosition:(p,area)=>{setPosition(p);setLocation(area);setActiveWorld(area.territory||null);},
    onBuilding:b=>{++landRequest.current;setBuilding(b);setPlot(null);setCheckingLand(false);},onEmptyLand:inspectLand,
  }),[inspectLand]);
  const clearSelection=()=>{++landRequest.current;setBuilding(null);setPlot(null);setCheckingLand(false);scene.current?.clearSelection();};
  const home=async()=>{try{const {data}=await api.post('/players/home');setPlayer(data);scene.current?.moveTo(SPAWN.x,SPAWN.y);setPosition(SPAWN);setPanel(null);clearSelection();}catch(e){toast.error(errorMessage(e));}};
  const viewTerritory=world=>{scene.current?.moveTo(world.center_x,world.center_y);setPosition({x:world.center_x,y:world.center_y});setPanel(null);clearSelection();};
  const enterWorld=async world=>{setBusy(true);try{const {data}=await api.post(`/worlds/${world.id}/enter`);setSelected(data);setPlayer(p=>({...p,world_id:world.id}));setPanel('world');await refreshWorlds();}catch(e){toast.error(errorMessage(e));}finally{setBusy(false);}};
  const enterBuilding=()=>{
    if(!building)return;
    if(building.worldId){const w=worlds.find(w=>w.id===building.worldId);setSelected(w);setPanel('world');}
    else setPanel(building.action||'place');
  };
  const savePlace=async b=>{try{await api.post('/places',{place_key:b.place_key,name:b.name||b.title,kind:b.kind,x:b.x,y:b.y});await refreshPlaces();toast.success('Place saved.');}catch(e){toast.error(errorMessage(e));}};
  const visitPlace=p=>{scene.current?.moveTo(p.x,p.y);setPosition({x:p.x,y:p.y});setPanel(null);clearSelection();};
  const connectWallet=async()=>{
    const provider=window.phantom?.solana;if(!provider?.isPhantom){setPanel('wallet');return;}setBusy(true);
    try{const result=await provider.connect(),wallet=result.publicKey.toString();const {data:c}=await api.post('/auth/challenge',{wallet});
      const signed=await provider.signMessage(new TextEncoder().encode(c.message),'utf8');
      const {data}=await api.post('/auth/verify',{wallet,nonce:c.nonce,signature:btoa(String.fromCharCode(...signed.signature))});
      setPlayer(data);toast.success('Wallet ownership verified.');
    }catch(e){toast.error(e.code===4001?'Wallet request cancelled.':errorMessage(e));}finally{setBusy(false);}
  };
  const createTerritory=()=>setPanel('create');
  return <div className="kingcom-app" data-testid="kingcom-app">
    <header className="app-header"><button className="brand" data-testid="brand-home" onClick={home} aria-label="Kingcom capital"><span className="brand-crown"><Crown size={25}/></span><span>KINGCOM<span className="brand-dot">.</span></span></button>
      <nav className="header-nav" aria-label="Main navigation"><button className={!panel?'nav-button active':'nav-button'} data-testid="nav-world" onClick={()=>setPanel(null)}><Globe2 size={17}/>World</button><button className="nav-button" data-testid="nav-explore" onClick={()=>setPanel('explore')}><Compass size={17}/>Explore</button></nav>
      <div className="header-actions"><span className="network-label" data-testid="network-status"><i/>Solana</span><Button variant="outline" className="wallet-button" data-testid="connect-wallet" onClick={player?.wallet?()=>setPanel('wallet'):connectWallet} disabled={!player||busy}><Wallet size={16}/><span>{player?.wallet?`${player.wallet.slice(0,4)}…${player.wallet.slice(-4)}`:'Connect wallet'}</span></Button><Button className="create-button" data-testid="create-world-button" disabled={!player} onClick={createTerritory}><Plus size={17}/><span>Create territory</span></Button></div>
    </header>
    <main className="world-stage" data-testid="world-stage">{player&&<GameCanvas callbacks={callbacks}/>}
      {(!ready||loadError)&&<div className="loading-world" data-testid="world-loading"><Crown size={40}/><h1>KINGCOM</h1>{loadError?<><p data-testid="startup-error">{loadError}</p><Button data-testid="retry-startup" onClick={initialize}>Try again</Button></>:<><Loader2 className="spin"/><p>A whole world is out there.</p></>}</div>}
      {player&&<><div className="map-location hud-surface" data-testid="current-location"><span className="location-icon"><MapPin size={21}/></span><div><small>{location.kind}</small><h1>{location.name}</h1></div></div>
        <div className="quick-tools hud-surface">{[[Map,'map','World map'],[UserRound,'profile','Your account'],[Settings2,'settings','Settings']].map(([Icon,id,label])=><button data-testid={`quick-${id}`} key={id} title={label} aria-label={label} onClick={()=>setPanel(id)}><Icon size={18}/></button>)}</div>
        <GameHUD {...{worlds,places,player,position,activeWorld,settings,joystick,home,setPanel,scene,chunkCount,building,plot,checkingLand,enterBuilding,createTerritory,clearSelection,savePlace}} openWorld={w=>{setSelected(w);setPanel('world');}}/>
        <WorldPanels {...{panel,setPanel,worlds,selected,setSelected,enterWorld,busy,player,refreshWorlds,connectWallet,setActiveWorld,viewTerritory,plot}}/>
        <PlayerPanels {...{panel,setPanel,player,setPlayer,worlds,places,refreshPlaces,settings,setSettings,scene,connectWallet,busy,home,position,setSelected,visitPlace}}/>
        <BuildingPanels {...{panel,setPanel,building,worlds,places,savePlace,scene,setSelected}}/>
      </>}
    </main><Toaster position="top-center" richColors closeButton toastOptions={{duration:4000}}/>
  </div>;
}