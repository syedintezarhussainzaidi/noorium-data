const fs=require('fs');const {norm}=require('./load');
function dice(a,b,n=300){a=a.slice(0,n);b=b.slice(0,n);if(a.length<2||b.length<2)return 0;const m=new Map();for(let i=0;i<a.length-1;i++){const g=a.substr(i,2);m.set(g,(m.get(g)||0)+1)}let h=0;for(let i=0;i<b.length-1;i++){const g=b.substr(i,2);const c=m.get(g);if(c>0){h++;m.set(g,c-1)}}return 2*h/(a.length+b.length-2)}
function alignVol(v){
  const ds=JSON.parse(fs.readFileSync(`ds_v${v}.json`));const api=JSON.parse(fs.readFileSync(`api/v${v}.json`,'utf8'));
  const an=api.map(e=>norm(e.arabicText||''));
  const full=new Map(),ps=new Map();
  ds.forEach((d,j)=>{(full.get(d.nfull)||full.set(d.nfull,[]).get(d.nfull)).push(j);const k=d.nfull.slice(0,40)+'|'+d.nfull.slice(-40);(ps.get(k)||ps.set(k,[]).get(k)).push(j)});
  const pairs=[];
  an.forEach((n,i)=>{let f=full.get(n);let w=4;if(!f){f=ps.get(n.slice(0,40)+'|'+n.slice(-40));w=3}
    if(f)f.forEach(j=>pairs.push({i,j,w,t:w===4?'exact':'prefsuf'}))});
  pairs.sort((x,y)=>x.i-y.i||x.j-y.j);
  // weighted LIS O(P^2)
  const P=pairs.length,best=new Array(P),prev=new Array(P).fill(-1);
  for(let a=0;a<P;a++){best[a]=pairs[a].w;for(let b=0;b<a;b++){if(pairs[b].i<pairs[a].i&&pairs[b].j<pairs[a].j&&best[b]+pairs[a].w>best[a]){best[a]=best[b]+pairs[a].w;prev[a]=b}}}
  let end=0;for(let a=1;a<P;a++)if(best[a]>best[end])end=a;
  const chain=[];for(let a=end;a>=0&&P>0;a=prev[a])chain.push(pairs[a]);chain.reverse();
  const map=new Array(api.length).fill(null);chain.forEach(p=>map[p.i]={j:p.j,t:p.t,s:1});
  // gap fill
  let pi=-1,pj=-1;const anchors=[...chain,{i:api.length,j:ds.length}];
  for(const an_ of anchors){
    const i1=pi+1,i2=an_.i-1,j1=pj+1,j2=an_.j-1;
    if(i2>=i1&&j2>=j1){
      const ni=i2-i1+1,nj=j2-j1+1;
      if(ni<=80&&nj<=80){
        // small DP alignment with dice
        const S=(x,y)=>{const s=dice(an[i1+x],ds[j1+y].nfull);return s};
        const sc=Array.from({length:ni+1},()=>new Array(nj+1).fill(0)),bt=Array.from({length:ni+1},()=>new Array(nj+1).fill(0));
        const cache={};
        for(let x=1;x<=ni;x++)for(let y=1;y<=nj;y++){const s=S(x-1,y-1);cache[x+','+y]=s;const m=s>=0.6?sc[x-1][y-1]+s:-1;let b=sc[x-1][y],c=0;if(sc[x][y-1]>b){b=sc[x][y-1];c=1}if(m>b){b=m;c=2}sc[x][y]=b;bt[x][y]=c}
        let x=ni,y=nj;while(x>0&&y>0){const c=bt[x][y];if(c===2){map[i1+x-1]={j:j1+y-1,t:'fuzzy',s:+cache[x+','+y].toFixed(2)};x--;y--}else if(c===0)x--;else y--}
      }
    }
    pi=an_.i;pj=an_.j;
  }
  return {ds,api,an,map};
}
module.exports={alignVol,dice};
if(require.main===module){
 const res={};
 for(let v=1;v<=8;v++){const {ds,api,map}=alignVol(v);const st={};map.forEach(m=>{const t=m?m.t:'none';st[t]=(st[t]||0)+1});console.log('v'+v,api.length,st);
  fs.writeFileSync(`map_v${v}.json`,JSON.stringify(map))}
}
