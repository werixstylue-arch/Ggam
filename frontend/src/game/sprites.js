// Original native 2D game sprites. All art uses one consistent two-world-unit pixel scale.
export const PIXEL_SCALE = 2;
const ink='#303c3c',shadow='#24373555';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const line=(c,color,x,y,w,h)=>rect(c,color,x,y,w,h);
function window(c,x,y,w=10,h=13){rect(c,ink,x,y,w,h);rect(c,'#8dbcc1',x+2,y+2,w-4,h-4);rect(c,'#cbddd2',x+2,y+2,2,h-4);rect(c,'#e8ddae',x+2,y+h-4,w-4,2);}
function door(c,x,y,w=13,h=21){rect(c,ink,x,y,w,h);rect(c,'#49747b',x+2,y+2,w-4,h-3);rect(c,'#99bbab',x+3,y+3,3,8);rect(c,'#eedba3',x+w-4,y+12,2,2);}
function pixels(c,rows,palette,x,y,s=1){rows.forEach((row,iy)=>[...row].forEach((v,ix)=>{if(palette[v])rect(c,palette[v],x+ix*s,y+iy*s,s,s);}));}
function text(c,value,x,y,color='#e7e5cf',size=8){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(value,x,y);}
function shell(c,{w=96,h=88,color='#cdccc0',roof='#718c88',trim='#e6dec2'}={}){
  rect(c,shadow,8,h-10,w-9,9);rect(c,ink,3,12,w-12,h-22);rect(c,color,6,17,w-18,h-30);
  rect(c,'#00000022',w-20,20,9,h-32);rect(c,ink,0,7,w-10,38);rect(c,roof,3,10,w-16,31);
  rect(c,trim,4,10,w-17,3);rect(c,'#00000020',4,37,w-17,5);rect(c,ink,0,43,w-10,3);
  rect(c,trim,4,h-16,w-17,3);for(let x=10;x<w-20;x+=20)rect(c,'#ffffff10',x,16,2,15);
}
function building(c,kind){
  const configs={shop:{color:'#d7c7a3',roof:'#ae6b52',trim:'#eddfb9'},cafe:{color:'#e5cfab',roof:'#638b92',trim:'#eddfb9'},apartments:{color:'#b5bdaf',roof:'#6f7b77',trim:'#dfd6bb'},warehouse:{color:'#a3ada5',roof:'#7b878b',trim:'#cad0bd'},house:{color:'#d6caae',roof:'#7d9779',trim:'#ece0b9'}};
  shell(c,configs[kind]);
  if(kind==='warehouse'){rect(c,ink,16,49,57,23);rect(c,'#7c8b84',19,51,51,21);for(let y=53;y<70;y+=4)rect(c,'#a0afa2',20,y,49,1);rect(c,'#d6b353',5,48,7,7);rect(c,'#3e4c49',7,50,3,3);rect(c,'#d3ccac',9,17,28,14);rect(c,'#748789',13,21,20,6);text(c,'404',24,25,ink,8);}
  else if(kind==='apartments'){for(let x=11;x<78;x+=19){window(c,x,48,11,11);window(c,x,63,11,11);}door(c,41,58,13,18);rect(c,'#d9b768',17,12,24,21);rect(c,'#c4a05b',17,29,24,4);rect(c,ink,61,20,14,13);rect(c,'#929c8c',63,22,10,9);}
  else {window(c,10,51,17,17);window(c,61,51,17,17);door(c,38,49,16,26);}
  if(kind==='shop'||kind==='cafe'){
    rect(c,ink,7,38,72,13);rect(c,kind==='shop'?'#e5b752':'#b9c5af',9,40,68,9);text(c,kind==='shop'?'GM MART':'NET CAFE',43,45,ink,8);
    rect(c,ink,5,50,76,6);for(let x=7;x<80;x+=10)rect(c,x%20===7?'#d87961':'#e4dfbc',x,50,9,5);
    rect(c,'#56665b',0,72,8,8);rect(c,'#87a366',1,65,6,7);
  }
  if(kind==='house'){rect(c,'#e8c168',62,19,11,9);rect(c,ink,60,17,15,3);rect(c,'#626e5b',3,69,7,11);rect(c,'#94ac73',0,63,12,8);}
}
function headquarters(c){
  rect(c,shadow,13,113,162,12);rect(c,ink,12,44,148,72);rect(c,'#cacdb9',16,48,140,64);
  rect(c,'#8caaa3',21,64,130,23);for(let x=23;x<150;x+=14){rect(c,ink,x,65,2,22);rect(c,'#c7e1ce',x+3,67,5,3);}
  rect(c,ink,7,24,154,38);rect(c,'#577a76',10,27,148,31);rect(c,'#80a297',13,28,139,3);
  rect(c,'#e5dfbe',5,55,159,7);rect(c,ink,17,39,136,14);text(c,'KINGCOM HQ',84,46,'#eef0c9',13);
  rect(c,ink,44,7,80,28);rect(c,'#d3cfae',47,10,74,22);rect(c,'#e6d263',73,4,21,24);
  pixels(c,['Y...Y...Y','YY.YYY.YY','YYYYYYYYY','YYYYYYYYY'],{Y:'#e7b958'},69,0,3);
  for(let x=23;x<145;x+=23){rect(c,'#e4e1c3',x,86,7,25);rect(c,'#b1b9a4',x+5,87,2,24);}
  door(c,69,87,30,28);rect(c,'#d5d5ba',8,113,161,5);rect(c,'#a4b2a0',4,118,170,4);
  rect(c,'#6d865d',0,96,12,17);rect(c,'#98b17a',0,92,14,8);rect(c,'#6d865d',160,96,12,17);rect(c,'#98b17a',158,92,16,8);
}
function monument(c){
  rect(c,shadow,9,76,59,9);rect(c,ink,5,67,62,13);rect(c,'#929d8c',8,68,56,9);rect(c,'#c9cfb4',4,65,64,5);
  rect(c,ink,23,36,26,32);rect(c,'#647f72',26,39,20,25);rect(c,'#86a18a',28,40,4,23);
  rect(c,ink,10,7,54,36);rect(c,'#dfb855',13,10,48,29);rect(c,'#f3d978',15,12,42,5);
  rect(c,ink,7,0,13,23);rect(c,ink,28,0,16,24);rect(c,ink,52,0,13,23);
  rect(c,'#e5be59',10,0,7,24);rect(c,'#f0d474',31,0,10,27);rect(c,'#dfb655',55,0,7,24);
  rect(c,'#ba8d44',15,31,44,8);rect(c,'#f3d675',17,30,40,3);
  rect(c,'#557164',27,51,18,9);text(c,'K',36,55,'#e9d082',8);
}
function frog(c){
  rect(c,shadow,8,64,50,8);rect(c,ink,4,60,52,8);rect(c,'#a3aaa0',7,61,46,4);
  pixels(c,['...KK....KK...','..KGGK..KGGK..','.KGGGGKKGGGGK.','.KGKKGGGGKKGK.','KGGKKGGGGKKGGK','KGGGGGGGGGGGGK','KGGKKKKKKKKGGK','.KGGGRRRRGGGK.','..KGGGGGGGGK..','...KGGGGGGK...','..KGKGKGKGK...','.KGGKKGKKGGK..'],{K:ink,G:'#79a37d',R:'#d0ae85'},3,12,4);
  rect(c,'#bdc994',14,27,10,3);rect(c,'#bdc994',38,27,10,3);
}
function billboard(c,kind='board'){
  rect(c,shadow,9,58,47,5);rect(c,ink,12,29,4,31);rect(c,ink,47,29,4,31);
  rect(c,ink,0,3,64,38);rect(c,'#d4c391',3,6,58,32);rect(c,'#e9dfb3',4,7,56,2);
  if(kind==='gate'){rect(c,'#557b81',6,11,52,22);text(c,'WORLD MAP',32,18,'#d9e8bf',8);text(c,'EXPLORE >',32,27,'#f0c769',7);}
  else {rect(c,'#faf0c9',8,12,16,17);rect(c,'#d28b66',11,15,9,3);rect(c,'#8caa9f',28,11,12,12);rect(c,'#d6af58',43,18,12,13);rect(c,ink,31,14,6,2);text(c,'BULLETIN',32,36,ink,7);}
}
function tree(c,kind='tree'){
  rect(c,shadow,9,48,35,7);rect(c,ink,22,28,7,24);rect(c,'#7e7253',24,32,4,18);
  if(kind==='pine'){pixels(c,['....K....','...KGK...','..KGGGK..','...KGK...','..KGGGK..','.KGGGGGK.','..KGGGK..','.KGGGGGK.','KGGGGGGGK'],{K:'#3e6150',G:'#648466'},6,3,4);return;}
  const colors=['#3e6652','#537e5e','#709468','#94ae79'];
  rect(c,colors[0],8,12,33,29);rect(c,colors[0],3,19,44,14);rect(c,colors[1],7,14,34,23);rect(c,colors[1],12,7,25,30);
  rect(c,colors[2],10,11,25,15);rect(c,colors[2],16,5,16,24);rect(c,colors[3],17,7,12,5);rect(c,colors[3],10,17,9,4);
  rect(c,colors[0],34,27,7,7);rect(c,colors[2],22,28,9,5);
}
function car(c,color='#cd795f'){
  rect(c,shadow,5,38,27,5);rect(c,ink,5,6,23,34);rect(c,color,7,4,19,34);rect(c,ink,3,10,4,8);rect(c,ink,26,10,4,8);rect(c,ink,3,27,4,8);rect(c,ink,26,27,4,8);
  rect(c,'#9ab8b5',9,12,15,7);rect(c,ink,8,19,17,2);rect(c,color,10,21,13,9);rect(c,'#637b7b',9,29,15,5);rect(c,'#efd99a',8,5,4,3);rect(c,'#efd99a',21,5,4,3);rect(c,'#d3bbb1',8,37,4,2);
}
function kiosk(c){rect(c,shadow,6,48,52,6);rect(c,ink,4,12,49,37);rect(c,'#95b6b0',7,15,43,31);rect(c,ink,10,23,37,15);rect(c,'#446662',12,25,33,11);rect(c,'#d1b788',8,39,43,6);rect(c,ink,0,4,58,17);for(let x=3;x<55;x+=8)rect(c,x%16===3?'#d78068':'#eadcb2',x,7,8,11);text(c,'GM',28,12,ink,8);}
function prop(c,kind){
  if(kind==='lamp'){rect(c,ink,10,9,3,41);rect(c,'#7c8b80',11,13,2,36);rect(c,ink,4,2,16,12);rect(c,'#e3d596',6,4,12,8);rect(c,'#f0e9c0',8,5,8,4);rect(c,ink,6,48,12,3);}
  if(kind==='bench'){rect(c,shadow,4,22,34,4);rect(c,ink,2,10,35,14);rect(c,'#b49268',3,10,33,4);rect(c,'#c5a779',3,16,33,4);rect(c,ink,6,21,3,6);rect(c,ink,30,21,3,6);}
  if(kind==='vending'){rect(c,shadow,4,31,20,5);rect(c,ink,2,2,22,32);rect(c,'#699ba8',4,4,18,28);rect(c,ink,6,7,11,13);rect(c,'#b3ccba',8,9,7,9);rect(c,'#d5b856',18,10,2,4);rect(c,ink,7,25,12,4);}
  if(kind==='rock'){rect(c,shadow,4,23,32,6);rect(c,ink,5,10,26,16);rect(c,'#89938a',8,6,20,17);rect(c,'#b4bbaa',11,6,14,8);rect(c,'#68776d',24,14,8,10);}
  if(kind==='cactus'){rect(c,shadow,9,35,24,5);rect(c,ink,15,4,9,33);rect(c,'#6c946d',17,6,5,30);rect(c,ink,5,13,9,14);rect(c,'#6c946d',7,14,6,10);rect(c,'#6c946d',11,22,10,4);rect(c,ink,26,8,9,16);rect(c,'#6c946d',26,11,6,16);rect(c,'#a9b979',18,8,2,26);}
  if(kind==='fence'){rect(c,'#53645b',0,8,64,3);rect(c,'#788777',0,10,64,2);rect(c,'#53645b',0,17,64,3);for(let x=4;x<64;x+=14){rect(c,ink,x,4,4,21);rect(c,'#8b947c',x+1,5,2,18);}}
  if(kind==='crate'){rect(c,ink,2,2,28,24);rect(c,'#ac916d',4,4,24,20);rect(c,'#d0b487',5,5,22,3);rect(c,'#776951',14,5,3,18);rect(c,'#776951',5,13,22,3);}
}

export function createSpriteAtlas(scene){
  const definitions={hq:[180,128,headquarters],monument:[74,88,monument],frog:[65,78,frog],
    shop:[98,90,c=>building(c,'shop')],cafe:[98,90,c=>building(c,'cafe')],apartments:[98,90,c=>building(c,'apartments')],
    house:[98,90,c=>building(c,'house')],warehouse:[98,90,c=>building(c,'warehouse')],
    board:[66,66,c=>billboard(c)],gate:[66,66,c=>billboard(c,'gate')],tree:[50,58,c=>tree(c)],pine:[50,58,c=>tree(c,'pine')],
    car:[35,46,c=>car(c)],taxi:[35,46,c=>car(c,'#d6b658')],kiosk:[62,57,kiosk],
    lamp:[24,54,c=>prop(c,'lamp')],bench:[42,30,c=>prop(c,'bench')],vending:[28,38,c=>prop(c,'vending')],
    rock:[40,32,c=>prop(c,'rock')],cactus:[40,44,c=>prop(c,'cactus')],fence:[64,28,c=>prop(c,'fence')],crate:[34,30,c=>prop(c,'crate')],
    bank:[112,100,c=>internetBuilding(c,'bank')],gallery:[112,100,c=>internetBuilding(c,'gallery')],lab:[112,100,c=>internetBuilding(c,'lab')],
    doghouse:[112,100,c=>internetBuilding(c,'doghouse')],froghouse:[112,100,c=>internetBuilding(c,'froghouse')],exchange:[112,100,c=>internetBuilding(c,'exchange')],
    tower:[94,145,c=>internetBuilding(c,'tower')],signal:[94,145,c=>internetBuilding(c,'signal')],moon:[94,145,c=>internetBuilding(c,'moon')]};
  for(const [key,[w,h,draw]] of Object.entries(definitions)){
    if(scene.textures.exists(key))continue;const texture=scene.textures.createCanvas(key,w,h);draw(texture.getContext());texture.refresh();
  }
}

function internetBuilding(c,kind){
  if(['tower','signal','moon'].includes(kind)){
    rect(c,shadow,10,133,76,8);rect(c,ink,5,124,80,13);rect(c,'#b4c0ad',8,127,74,7);
    if(kind==='signal'){
      rect(c,ink,35,8,16,118);rect(c,'#8a9f97',39,12,8,114);
      for(let y=23;y<119;y+=16){rect(c,'#bacabd',30,y,27,4);rect(c,ink,35,y+5,16,2);}
      rect(c,ink,15,18,56,7);rect(c,'#92b6a6',18,20,50,3);rect(c,'#d78767',38,0,9,9);
      rect(c,ink,14,91,27,35);rect(c,'#c7cfb6',17,94,21,30);door(c,22,105,11,20);
      rect(c,ink,58,54,24,26);rect(c,'#c9d7be',60,56,18,21);rect(c,'#71968d',65,60,12,14);
    }else if(kind==='moon'){
      rect(c,ink,24,26,41,100);rect(c,'#d0d5c0',27,29,35,94);rect(c,ink,29,13,31,16);rect(c,'#d47d62',32,14,25,17);rect(c,'#d47d62',38,4,13,15);
      rect(c,ink,33,45,23,23);rect(c,'#6594a2',36,48,17,17);rect(c,'#aacdc4',38,50,5,10);
      rect(c,ink,14,89,11,37);rect(c,'#c57859',17,92,11,31);rect(c,ink,65,89,11,37);rect(c,'#c57859',63,92,10,31);door(c,35,95,20,31);
    }else{
      rect(c,ink,12,16,64,109);rect(c,'#7d9f98',16,20,56,101);rect(c,'#385952',20,27,48,88);
      for(let y=31;y<108;y+=18)for(let x=23;x<65;x+=13)window(c,x,y,9,12);
      rect(c,ink,8,4,72,21);rect(c,'#c3cba7',11,7,66,15);text(c,'STONKS',44,15,ink,10);door(c,36,101,19,25);
    }return;
  }
  const roofs={bank:'#87938b',gallery:'#ba8a69',lab:'#829c91',doghouse:'#ba9163',froghouse:'#648d69',exchange:'#658b9b'};
  shell(c,{w:112,h:100,color:'#cecdb7',roof:roofs[kind],trim:'#e8deb8'});
  window(c,10,57,21,22);window(c,75,57,20,22);door(c,44,57,18,30);
  const title={bank:'MEME BANK',gallery:'PIXEL GALLERY',lab:'MEME LAB',doghouse:'DOG HOUSE',froghouse:'FROG HOUSE',exchange:'TOKEN EXCHANGE'}[kind];
  rect(c,ink,7,40,91,15);rect(c,kind==='exchange'?'#a2bfc0':'#dcc996',9,42,87,11);text(c,title,52,48,ink,9);
  if(kind==='bank'){for(const x of [6,33,68,98]){rect(c,'#9da68e',x,58,7,29);rect(c,'#e7dfc2',x,57,4,29);}rect(c,'#d9b95f',40,14,22,20);text(c,'B',51,25,ink,17);}
  if(kind==='gallery'){rect(c,'#dfd7ba',16,16,25,17);rect(c,'#577f78',18,18,21,13);rect(c,'#d6986e',23,21,11,8);rect(c,'#c3caa3',67,16,21,17);rect(c,'#a17c90',70,19,15,11);}
  if(kind==='lab'){rect(c,ink,45,6,16,27);rect(c,'#b3ceb6',48,9,10,23);rect(c,'#759974',45,25,17,9);rect(c,'#c5dec6',51,12,4,12);rect(c,ink,44,3,18,5);}
  if(kind==='froghouse'){for(const x of [22,69]){rect(c,ink,x,1,21,23);rect(c,'#8bab7b',x+3,3,15,19);rect(c,'#ece1b4',x+6,6,10,9);rect(c,ink,x+10,7,4,7);}rect(c,'#bdc59d',35,24,31,6);}
  if(kind==='doghouse'){rect(c,ink,8,0,17,27);rect(c,'#936e50',10,2,13,22);rect(c,ink,81,0,17,27);rect(c,'#936e50',83,2,13,22);rect(c,ink,41,18,19,9);rect(c,'#e2bf84',39,27,25,6);}
  if(kind==='exchange'){for(let i=0;i<5;i++){rect(c,'#c0d9a6',27+i*10,32-i*4,7,5+i*4);}}
}

export const BUILDING_INFO={
  hq:{name:'Kingcom HQ',category:'Civic headquarters',action:'hq'},shop:{name:'Meme Shop',category:'Community marketplace',action:'explore'},
  cafe:{name:'Internet Café',category:'Internet culture',action:'place'},apartments:{name:'Community HQ',category:'Community building',action:'place'},
  house:{name:'Internet House',category:'Neighborhood landmark',action:'place'},warehouse:{name:'Meme News',category:'Community bulletin',action:'news'},
  bank:{name:'Meme Bank',category:'Wallet & community access',action:'wallet'},gallery:{name:'Meme Gallery',category:'Saved places & architecture',action:'collection'},
  lab:{name:'Meme Lab',category:'Community registry',action:'create'},doghouse:{name:'Dog House',category:'Meme architecture',action:'place'},
  froghouse:{name:'Frog House',category:'Meme architecture',action:'place'},exchange:{name:'Token Exchange',category:'Token community discovery',action:'explore'},
  tower:{name:'Stonk Tower',category:'Community rankings',action:'leaderboard'},signal:{name:'Signal Tower',category:'World navigation',action:'map'},
  moon:{name:'Moon Station',category:'A landmark for the long journey',action:'place'},monument:{name:'Meme Monument',category:'Public landmark',action:'place'},
  frog:{name:'Frog Monument',category:'Public landmark',action:'place'},gate:{name:'Explore Center',category:'World navigation',action:'map'},
  board:{name:'Meme News',category:'Community bulletin',action:'news'},kiosk:{name:'Meme Market',category:'Community discovery',action:'explore'}
};

export const CAPITAL_OBJECTS = [
  {id:'hq',kind:'hq',x:0,y:-135,action:'hq',title:'Kingcom HQ',w:330,h:165},
  {id:'monument',kind:'monument',x:0,y:70,title:'Kingcom Monument',action:'place',w:98,h:60},
  {id:'market',kind:'shop',x:-415,y:-30,title:'Marketplace',action:'explore',w:160,h:80},
  {id:'cafe',kind:'cafe',x:413,y:60,title:'Internet Café',action:'place',w:160,h:80},
  {id:'community',kind:'bank',x:-425,y:-330,title:'Community Hall',action:'leaderboard',w:185,h:95},
  {id:'registry',kind:'lab',x:420,y:-320,title:'World Registry',action:'create',w:185,h:95},
  {id:'notice',kind:'board',x:256,y:242,title:'Community bulletin',action:'news',w:94,h:22},
  {id:'gate',kind:'signal',x:525,y:280,title:'Explore Center',action:'map',w:130,h:35},
  {id:'kiosk1',kind:'gallery',x:-330,y:320,title:'Collection Hall',action:'collection',w:185,h:95},
  {id:'kiosk2',kind:'kiosk',x:-175,y:282,w:96,h:40},
  {id:'frog',kind:'frog',x:-560,y:350,title:'The Local Legend',action:'place',w:85,h:38},
  {id:'vending',kind:'vending',x:300,y:70,w:42,h:25},
  ...[-220,210].flatMap(x=>[-28,200].map(y=>({kind:'bench',x,y,w:70,h:22}))),
  ...[-555,555].flatMap(x=>[-240,90,315].map(y=>({kind:'lamp',x,y,w:18,h:15}))),
  ...[-310,305].flatMap(x=>[-245,-140].map(y=>({kind:'tree',x,y,w:24,h:22}))),
];