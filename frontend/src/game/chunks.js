import { CHUNK_SIZE, CENTER, hash, surfaceAt, biomeAt, cityAt } from './geography';
import { CAPITAL_OBJECTS } from './sprites';

const COLORS={grass:'#91a879',forest:'#768f69',desert:'#d6be86',beach:'#d8cca0',water:'#619fa5',ocean:'#487e90',mountain:'#99a092',concrete:'#a7ada0',sidewalk:'#c3c7b6',plaza:'#c2c6b3',road:'#656f70',highway:'#5c676a'};
export function renderChunk(scene,cx,cy,worlds){
  const key=`chunk-${cx}-${cy}`,size=CHUNK_SIZE/2,texture=scene.textures.createCanvas(key,size,size),c=texture.getContext();
  const wx=cx*CHUNK_SIZE,wy=cy*CHUNK_SIZE;
  c.imageSmoothingEnabled=false;
  for(let py=0;py<size;py+=8)for(let px=0;px<size;px+=8){
    const x=wx+px*2+8,y=wy+py*2+8,s=surfaceAt(x,y,worlds),r=hash(Math.floor(x/16),Math.floor(y/16));
    c.fillStyle=COLORS[s.type];c.fillRect(px,py,8,8);
    if(s.type==='road'||s.type==='highway'){
      const local=s.vertical?x:y,along=s.vertical?y:x,dist=Math.abs(local-s.center);
      if(dist<8 && Math.floor(along/24)%3!==0){c.fillStyle=s.type==='highway'?'#e0c178':'#c6cbbb';c.fillRect(px+(s.vertical?3:0),py+(s.vertical?0:3),s.vertical?1:8,s.vertical?8:1);}
      if(s.type==='road'&&dist>24){c.fillStyle='#c0c5ad';c.fillRect(px,py,s.vertical?1:8,s.vertical?8:1);}
      if(s.type==='highway'&&dist>48&&dist<59){c.fillStyle='#c1c4ae';c.fillRect(px,py,s.vertical?1:8,s.vertical?8:1);}
      if(['water','ocean'].includes(biomeAt(x,y))){c.fillStyle='#9ca794';if(s.vertical)c.fillRect(px,py,1,8);else c.fillRect(px,py,8,1);}
    }else if(['concrete','sidewalk','plaza'].includes(s.type)){
      if(Math.floor(x/16)%4===0){c.fillStyle='#0000000b';c.fillRect(px,py,1,8);}if(Math.floor(y/16)%4===0){c.fillStyle='#0000000a';c.fillRect(px,py,8,1);}
      if(r>.88){c.fillStyle='#87988844';c.fillRect(px+3,py+4,2,1);}
      if(s.type==='plaza'&&Math.hypot(x-CENTER,y-CENTER-45)<118){c.fillStyle='#a6b7a0';c.fillRect(px,py,8,8);}
    }else if(s.type==='water'||s.type==='ocean'){
      if(r>.84){c.fillStyle='#b9d4bb55';c.fillRect(px+1,py+3,5,1);}
    }else{
      if(r>.72){c.fillStyle='#ffffff12';c.fillRect(px+1,py+2,4,2);}if(r<.2){c.fillStyle='#253c2916';c.fillRect(px+4,py+5,2,1);}
      if((s.type==='grass'||s.type==='forest')&&r>.89){c.fillStyle='#597c5744';c.fillRect(px+3,py+3,1,3);c.fillRect(px+2,py+4,3,1);}
    }
  }
  texture.refresh();
  const terrain=scene.add.image(wx,wy,key).setOrigin(0).setScale(2).setDepth(-1000);
  const objects=objectsForChunk(cx,cy,worlds),sprites=[];
  for(const object of objects){
    const sprite=scene.add.image(object.x,object.y,object.kind).setOrigin(.5,1).setScale(2).setDepth(object.y);
    sprites.push(sprite);
  }
  return {key,terrain,sprites,objects,dispose(){terrain.destroy();sprites.forEach(s=>s.destroy());scene.textures.remove(key);}};
}

export function objectsForChunk(cx,cy,worlds){
  const result=[],startX=cx*CHUNK_SIZE,startY=cy*CHUNK_SIZE;
  const inside=o=>o.x>=startX&&o.x<startX+CHUNK_SIZE&&o.y>=startY&&o.y<startY+CHUNK_SIZE;
  CAPITAL_OBJECTS.forEach(o=>{const item={...o,x:CENTER+o.x,y:CENTER+o.y};if(inside(item))result.push(item);});
  worlds.forEach(world=>{
    const props=[{kind:world.style==='industrial'?'warehouse':'apartments',x:world.center_x,y:world.center_y-90,w:165,h:85,title:`${world.symbol} Community Hall`,action:'territory',worldId:world.id},
      {kind:'gate',x:world.center_x+210,y:world.center_y+165,w:92,h:24,title:`${world.symbol} Territory`,action:'territory',worldId:world.id},
      {kind:world.style==='suburb'?'house':'shop',x:world.center_x-230,y:world.center_y+80,w:160,h:80},
      {kind:'frog',x:world.center_x+185,y:world.center_y-95,w:85,h:38},
      {kind:world.region%2===0?'doghouse':'froghouse',x:world.center_x+390,y:world.center_y+70,w:180,h:90}];
    if(world.level>=2)props.push({kind:'house',x:world.center_x-260,y:world.center_y-130,w:160,h:80});
    if(world.level>=3)props.push({kind:'kiosk',x:world.center_x-145,y:world.center_y+220,w:96,h:40});
    if(world.level>=5)props.push({kind:'warehouse',x:world.center_x+360,y:world.center_y+5,w:160,h:80});
    props.forEach(o=>{if(inside(o))result.push(o);});
  });
  for(let gy=Math.floor(startY/128);gy<Math.ceil((startY+CHUNK_SIZE)/128);gy++)for(let gx=Math.floor(startX/128);gx<Math.ceil((startX+CHUNK_SIZE)/128);gx++){
    const x=gx*128+64+Math.floor(hash(gx,gy,1)*28),y=gy*128+88+Math.floor(hash(gx,gy,2)*24),r=hash(gx,gy,3);
    if(Math.abs(x-CENTER)<700&&Math.abs(y-CENTER)<470)continue;
    if(worlds.some(w=>Math.hypot(x-w.center_x,y-w.center_y)<460))continue;
    const s=surfaceAt(x,y,worlds),city=cityAt(x,y,worlds);
    if(s.type==='road'||s.type==='highway'||s.type==='water'||s.type==='ocean')continue;
    if(city){
      if(gx%2===0&&gy%2===0&&r>.15){
        const kinds=city.style==='industrial'?['warehouse','lab','signal','exchange']:city.style==='suburb'?['house','doghouse','froghouse','cafe']:['bank','gallery','exchange','tower','moon','shop','cafe','lab','doghouse','froghouse'];
        const kind=kinds[Math.floor(hash(gx,gy,19)*kinds.length)];
        result.push({kind,x,y,w:160,h:80});
        if(r>.58)result.push({kind:'vending',x:x+100,y:y+4,w:40,h:24});
      }else if(r>.65)result.push({kind:r>.88?'taxi':r>.78?'car':'tree',x,y,w:r>.78?46:24,h:r>.78?65:24});
      else if(r<.12)result.push({kind:'fence',x,y,w:120,h:12});
    }else if(s.type==='forest'&&r>.17 || s.type==='grass'&&r>.81){result.push({kind:r>.77?'pine':'tree',x,y,w:24,h:23});}
    else if(s.type==='desert'&&r>.85)result.push({kind:'cactus',x,y,w:30,h:20});
    else if(s.type==='mountain'&&r>.28)result.push({kind:r>.7?'pine':'rock',x,y,w:60,h:28});
    else if(r>.96)result.push({kind:'rock',x,y,w:55,h:26});
  }
  return result;
}