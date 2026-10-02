export const WORLD_SIZE = 65536;
export const CENTER = 32768;
export const CHUNK_SIZE = 512;
export const SPAWN = { x: CENTER, y: CENTER + 40 };
export const INITIAL_REGIONS = [
  [4300,1800,'BONK Borough','urban'],[-4800,-2700,'WIF Outskirts','suburb'],
  [6400,6600,'Popcat Coast','coastal'],[2200,-7400,'Jupiter Junction','industrial'],
];
export const LANDMARKS = [
  {id:'capital',name:'Kingcom Kingdom',x:CENTER,y:CENTER,kind:'capital'},
  {id:'meme-mile',name:'Meme Mile',x:CENTER-1600,y:CENTER+2800,kind:'meme'},
  {id:'industrial',name:'404 Industrial Park',x:CENTER+3400,y:CENTER-3500,kind:'industrial'},
  {id:'forest',name:'The Offline Forest',x:CENTER-6800,y:CENTER+1200,kind:'forest'},
  {id:'desert',name:'No Signal Desert',x:CENTER-3000,y:CENTER+12000,kind:'desert'},
  {id:'mountain',name:'Mount ATH',x:CENTER-8000,y:CENTER-11000,kind:'mountain'},
  {id:'lake',name:'Mirror Lake',x:CENTER+8700,y:CENTER+8500,kind:'water'},
  {id:'beach',name:'Endless Summer',x:CENTER+20500,y:CENTER+6000,kind:'beach'},
];

export const hash = (x,y,seed=0) => {
  let h = Math.imul(x|0,374761393) + Math.imul(y|0,668265263) + Math.imul(seed+42069,1274126177);
  h = Math.imul(h ^ (h >>> 13),1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const lerp = (a,b,t) => a+(b-a)*t;
export function noise(x,y,scale=3000) {
  x/=scale;y/=scale; const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  return lerp(lerp(hash(ix,iy),hash(ix+1,iy),sx),lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
}
export function regionFor(index) {
  if(index<4){const [x,y,,style]=INITIAL_REGIONS[index];return {x:CENTER+x,y:CENTER+y+260,labelX:CENTER+x,labelY:CENTER+y,center_x:CENTER+x,center_y:CENTER+y,style};}
  const angle=index*2.399963229728653,radius=3500+Math.sqrt(index)*1900;
  const x=CENTER+Math.round(Math.cos(angle)*radius),y=CENTER+Math.round(Math.sin(angle)*radius);
  return {x,y:y+260,labelX:x,labelY:y,center_x:x,center_y:y,style:['urban','suburb','industrial','meme'][index%4]};
}
export function territoryContains(x,y,w,margin=0) {
  const dx=x-w.center_x,dy=y-w.center_y,a=Math.atan2(dy,dx);
  const r=510+Math.min(300,w.points*.25);
  return Math.hypot(dx,dy)<r*(1+.16*Math.sin(a*3+w.region)+.09*Math.cos(a*5))+margin;
}
export function biomeAt(x,y) {
  const dx=x-CENTER,dy=y-CENTER;
  const n=noise(x,y,2600),coast=Math.hypot(dx/28500,dy/30200)+n*.19;
  if(coast>1.04)return 'ocean'; if(coast>1)return 'beach';
  const lake=Math.hypot((dx-8700)/2000,(dy-8500)/2700);
  if(lake<.82+n*.2)return 'water'; if(lake<1+n*.14)return 'beach';
  const river=CENTER+12000+Math.sin(y/2400)*1650+Math.sin(y/610)*280;
  if(Math.abs(x-river)<125+n*65)return 'water';
  if(Math.abs(x-river)<185+n*70)return 'beach';
  if(Math.hypot((dx+8000)/6300,(dy+11000)/5100)<.75+n*.4)return 'mountain';
  if(Math.hypot((dx+3500)/8000,(dy-17000)/11500)<.80+n*.38)return 'desert';
  if(Math.hypot((dx+7800)/6100,(dy-600)/8000)<.75+n*.45 || n>.71)return 'forest';
  return 'grass';
}
export function cityAt(x,y,worlds=[]) {
  const dx=x-CENTER,dy=y-CENTER;
  if(Math.hypot(dx/1.14,dy)<1600+noise(x,y,700)*350)return {x:CENTER,y:CENTER,style:'urban',capital:true};
  for(const w of worlds)if(territoryContains(x,y,w,150))return {x:w.center_x,y:w.center_y,style:w.style,world:w};
  for(const l of LANDMARKS.filter(l=>['meme','industrial'].includes(l.kind)))if(Math.hypot(x-l.x,y-l.y)<950)return {x:l.x,y:l.y,style:l.kind};
  return null;
}
const mod = (n,m) => ((n%m)+m)%m;
export function surfaceAt(x,y,worlds=[]) {
  const city=cityAt(x,y,worlds),dx=x-CENTER,dy=y-CENTER;
  if(Math.abs(dx)<580 && dy>-400 && dy<350)return {type:'plaza',city};
  const hy=CENTER+590+Math.sin(dx/2400)*100;
  const hx=CENTER+1920+Math.sin(dy/2900)*160;
  if(Math.abs(y-hy)<64 || Math.abs(x-hx)<64)return {type:'highway',city,vertical:Math.abs(x-hx)<64,center:Math.abs(x-hx)<64?hx:hy};
  for(const w of worlds){
    if(Math.abs(y-(w.center_y+350))<30 && x>Math.min(w.center_x,CENTER+1920)-40 && x<Math.max(w.center_x,CENTER+1920)+40)return {type:'road',city,vertical:false,center:w.center_y+350};
    if(Math.abs(x-w.center_x)<28 && Math.abs(y-w.center_y)<400)return {type:'road',city,vertical:true,center:w.center_x};
  }
  if(city){
    const rx=mod(x-city.x+192,384)-192,ry=mod(y-city.y+192,384)-192;
    if(Math.abs(rx)<34 || Math.abs(ry)<34)return {type:'road',city,vertical:Math.abs(rx)<34,center:Math.abs(rx)<34?x-rx:y-ry};
    if(Math.abs(rx)<47 || Math.abs(ry)<47)return {type:'sidewalk',city};
    return {type:city.style==='suburb'?'grass':'concrete',city};
  }
  return {type:biomeAt(x,y),city:null};
}
export function locationName(x,y,worlds) {
  const territory=worlds.find(w=>territoryContains(x,y,w)); if(territory)return {name:territory.name,kind:'COMMUNITY TERRITORY',territory};
  if(Math.hypot(x-CENTER,y-CENTER)<1850)return {name:'Kingcom Kingdom',kind:'CENTRAL CAPITAL'};
  const l=LANDMARKS.find(l=>l.id!=='capital'&&Math.hypot(x-l.x,y-l.y)<1600);if(l)return {name:l.name,kind:'THE OPEN CONTINENT'};
  const biome=biomeAt(x,y);return {name:({forest:'Offline Woodlands',desert:'No Signal Desert',mountain:'The High Ground',beach:'The Long Coast',water:'River Crossing',ocean:'Open Ocean'})[biome]||'The Openlands',kind:'THE OPEN CONTINENT'};
}