import Phaser from 'phaser';
import { createSpriteAtlas, BUILDING_INFO } from './sprites';
import { renderChunk } from './chunks';
import { CENTER, CHUNK_SIZE, SPAWN, locationName } from './geography';
export { regionFor } from './geography';

export class WorldScene extends Phaser.Scene {
  constructor(callbacks){super('Kingcom');this.callbacks=callbacks;this.chunks=new Map();this.blocked=false;this.lastEmit=0;this.lastChunkCheck=0;this.labelsVisible=true;}
  create(){
    createSpriteAtlas(this);this.worlds=this.callbacks.getWorlds();
    const saved=this.callbacks.getProfile();this.focus={x:saved?.x??SPAWN.x,y:saved?.y??SPAWN.y};
    this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT');
    this.selection=this.add.graphics().setDepth(1e7);
    this.input.on('pointerdown',p=>{if(!this.blocked)this.drag={x:p.x,y:p.y,lastX:p.x,lastY:p.y,moved:false};});
    this.input.on('pointermove',p=>{
      if(this.blocked||!this.drag||!p.isDown)return;
      if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>4)this.drag.moved=true;
      if(this.drag.moved){this.focus.x-=(p.x-this.drag.lastX)/this.cameras.main.zoom;this.focus.y-=(p.y-this.drag.lastY)/this.cameras.main.zoom;}
      this.drag.lastX=p.x;this.drag.lastY=p.y;
    });
    this.input.on('pointerup',p=>{
      if(!this.blocked&&this.drag&&!this.drag.moved){const point=this.cameras.main.getWorldPoint(p.x,p.y);this.selectLocation(point.x,point.y);}
      this.drag=null;
    });
    this.input.on('wheel',(p,objects,dx,dy)=>{if(!this.blocked)this.zoom(dy>0?-.1:.1);});
    this.scale.on('resize',()=>this.resizeCamera());this.resizeCamera();this.refreshWorlds(this.worlds);this.updateChunks();
    this.lastFrameAt=performance.now();
    this.visibilityHandler=()=>{this.lastFrameAt=performance.now();this.input.keyboard.resetKeys();this.drag=null;};
    document.addEventListener('visibilitychange',this.visibilityHandler);
    this.events.once('shutdown',()=>{document.removeEventListener('visibilitychange',this.visibilityHandler);this.chunks.forEach(c=>c.dispose());this.chunks.clear();});
    this.callbacks.onReady(this);
  }
  resizeCamera(){this.baseZoom=this.scale.width<600?.5:.78;this.cameras.main.setZoom(this.baseZoom);this.cameras.main.centerOn(this.focus.x,this.focus.y);}
  zoom(delta){this.baseZoom=Phaser.Math.Clamp(this.baseZoom+delta,.38,1.7);this.cameras.main.setZoom(this.baseZoom);this.updateChunks();}
  setProfile(){}
  setLabels(value){this.labelsVisible=value;this.markers?.forEach(m=>m.setVisible(value));}
  refreshWorlds(worlds){
    const signature=worlds.map(w=>`${w.id}:${w.level}:${w.points}:${w.center_x}:${w.center_y}`).join('|');
    const changed=this.signature!==signature;this.signature=signature;this.worlds=worlds;
    if(changed){this.chunks.forEach(c=>c.dispose());this.chunks.clear();this.updateChunks();}
    (this.markers||[]).forEach(m=>m.destroy());this.markers=[];
    worlds.forEach(w=>{
      const marker=this.add.text(w.center_x,w.center_y-315,`$${w.symbol} TERRITORY`,{fontFamily:'Pixelify Sans',fontSize:'16px',color:'#304a3d',backgroundColor:'#edeed4',padding:{x:12,y:6}}).setOrigin(.5).setDepth(1e7).setVisible(this.labelsVisible);
      this.markers.push(marker);
    });
  }
  updateChunks(){
    if(!this.focus)return;const cam=this.cameras.main,vw=cam.width/cam.zoom,vh=cam.height/cam.zoom;
    const minX=Math.floor((this.focus.x-vw/2-180)/CHUNK_SIZE),maxX=Math.floor((this.focus.x+vw/2+180)/CHUNK_SIZE);
    const minY=Math.floor((this.focus.y-vh/2-180)/CHUNK_SIZE),maxY=Math.floor((this.focus.y+vh/2+180)/CHUNK_SIZE);
    const desired=new Set();for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)desired.add(`${x},${y}`);
    this.chunks.forEach((chunk,key)=>{if(!desired.has(key)){chunk.dispose();this.chunks.delete(key);}});
    desired.forEach(key=>{if(!this.chunks.has(key)){const [x,y]=key.split(',').map(Number);this.chunks.set(key,renderChunk(this,x,y,this.worlds));}});
    this.callbacks.onChunks?.(this.chunks.size);
  }
  selectLocation(x,y){
    const objects=[...this.chunks.values()].flatMap(c=>c.objects).sort((a,b)=>b.y-a.y);
    const object=objects.find(o=>{const t=this.textures.get(o.kind).getSourceImage();return (o.action||BUILDING_INFO[o.kind])&&x>=o.x-t.width&&x<=o.x+t.width&&y>=o.y-t.height*2&&y<=o.y;});
    if(object){const info=BUILDING_INFO[object.kind]||{};this.selectBuilding({...info,...object,name:object.title||info.name||object.kind,action:object.action||info.action||'place',place_key:`${object.kind}:${object.x}:${object.y}`});}
    else{this.selection.clear();this.callbacks.onEmptyLand({x:Math.round(x),y:Math.round(y)});}
  }
  selectBuilding(building){
    this.selection.clear().lineStyle(2,0xf6d977,.95).strokeRect(building.x-(building.w||100)/2-10,building.y+4,(building.w||100)+20,8);
    this.callbacks.onBuilding(building);
  }
  highlightLand(plot){
    this.selection.clear().lineStyle(3,0xf4e4a2,.9);
    this.selection.beginPath();for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,r=560*(1+.1*Math.sin(a*3));const x=plot.x+Math.cos(a)*r,y=plot.y+Math.sin(a)*r;i?this.selection.lineTo(x,y):this.selection.moveTo(x,y);}this.selection.strokePath();
  }
  clearSelection(){this.selection?.clear();}
  moveTo(x,y){this.focus={x,y};this.drag=null;this.cameras.main.centerOn(x,y);this.updateChunks();}
  update(time){
    if(!this.focus)return;const now=performance.now(),elapsed=document.hidden?0:Math.min(.25,(now-this.lastFrameAt)/1000);this.lastFrameAt=now;
    if(!this.blocked&&!this.drag){
      let dx=(this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0),dy=(this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0);
      const j=this.callbacks.getJoystick();if(j.x||j.y){dx=j.x;dy=j.y;}const length=Math.hypot(dx,dy);
      if(length){const step=(this.keys.SHIFT.isDown?1800:900)*elapsed/this.cameras.main.zoom;this.focus.x+=dx/length*step;this.focus.y+=dy/length*step;}
    }
    this.focus.x=Phaser.Math.Clamp(this.focus.x,0,65536);this.focus.y=Phaser.Math.Clamp(this.focus.y,0,65536);
    const cam=this.cameras.main,rate=this.drag?.moved?1:.22;
    cam.scrollX=Phaser.Math.Linear(cam.scrollX,this.focus.x-cam.width/2,rate);cam.scrollY=Phaser.Math.Linear(cam.scrollY,this.focus.y-cam.height/2,rate);
    if(time-this.lastChunkCheck>160){this.updateChunks();this.lastChunkCheck=time;}
    if(time-this.lastEmit>200){this.callbacks.onPosition({x:Math.round(this.focus.x),y:Math.round(this.focus.y)},locationName(this.focus.x,this.focus.y,this.worlds));this.lastEmit=time;}
  }
}