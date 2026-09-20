const fs=require('fs'),zlib=require('zlib');
const {norm}=require('./load');const {alignVol}=require('./align');
const P=JSON.parse(fs.readFileSync('people.json'));
const OUT='noorium-data-isnad/isnad/kafi';fs.mkdirSync(OUT,{recursive:true});
const st=s=>(s||'').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'');
const CONN=new Set(['عن','قال','و','جميعا','فقال','يقول','وقال','قالا','اخبرنا','أخبرنا','حدثنا','وحدثنا','قال:']);
const BACKREF=/^(ابيه|عنه|جده|ابنه|اخيه|ابنيه|اخوينه|ابائه|آبائه|غيره|بعض اصحابه|عده من اصحابه|بعض رجاله|جدّه)(\s|$)/;
function isBackRef(ar){const s=st(ar).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').trim();return /^(ابيه|عنه|جده|ابنه|اخيه|ابائه|غيره|بعض اصحابه|عده من اصحابه|بعض رجاله)(\s|$)/.test(s)||/^اخيه$/.test(s)}
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function fnv(s){let h=0x811c9dc5;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h}
function token(apiNorm){return (fnv(apiNorm.slice(0,24))&0xffff).toString(16).padStart(4,'0')}
function gradeText(gr){
  if(!gr||!gr.length)return '';
  return gr.map(g=>{const t=g.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();const m=t.match(/^(.*?):\s*(.*?)\s*(?: - .*)?$/);if(!m)return t;let who=m[1].replace(/^Allamah Baqir al-Majlisi$/,'Majlisi').replace(/^Shaykh Baqir al-Behbudi$/,'Behbudi').replace(/^(Shaykh|Allamah|Sayyid)\s+/,'');return who+': '+m[2].trim()}).join(' | ');
}
function buildChain(chain){
  const parts=chain.parts;let last=-1;parts.forEach((p,i)=>{if(p.kind==='narrator')last=i});
  const c=[];let flagged=false;
  parts.forEach((p,i)=>{
    if(p.kind==='narrator'){const id=(p.path||'').split('/').pop();const pe=P[id]||{};const a=p.text.replace(/\s+/g,' ').trim()||pe.ar;if(!norm(a))return;const o={i:+id};if(pe.en)o.n=pe.en;o.a=a;if(isBackRef(a))o.r=1;c.push(o)}
    else if(i<last){const words=st(p.text).replace(/[()،:,.؛\-ـ]/g,' ').replace(/[\d٠-٩]+/g,' ').trim().split(/\s+/).filter(Boolean);
      if(words.some(w=>!CONN.has(w))){c.push({t:p.text.replace(/\s+/g,' ').trim()});}}
  });
  return c;
}
const summary={};const allStats={total:0,withChain:0};
const report={};
for(let v=1;v<=8;v++){
  const {ds,api,an,map}=alignVol(v);
  const h={};const st_={apiTotal:api.length,exact:0,prefsuf:0,fuzzy:0,noMatch:0,noChainInDs:0,chainMismatchDropped:0,emitted:0};
  const dropped=[];
  api.forEach((e,i)=>{
    const m=map[i];if(!m){st_.noMatch++;dropped.push([e.id,'nomatch']);return}
    const d=ds[m.j];
    if(!d.chain){st_.noChainInDs++;dropped.push([e.id,'ds-has-no-chain',d.k]);return}
    const cn=norm(d.chain.parts.map(p=>p.text).join(''));
    const a0=an[i].slice(0,cn.length);
    const dist=lev(a0,cn);const ratio=1-dist/Math.max(cn.length,1);
    if(m.t!=='exact'&&ratio<0.9){st_.chainMismatchDropped++;dropped.push([e.id,'chain-mismatch',d.k,ratio.toFixed(2)]);return}
    st_[m.t]++;
    const c=buildChain(d.chain);if(!c.some(x=>x.i!==undefined)){dropped.push([e.id,'empty-chain',d.k]);return}
    const g=gradeText(d.gr);
    const o={t:token(an[i]),c};if(g)o.g=g;
    if(m.t!=='exact')o.q=m.t==='prefsuf'?1:2; // 1=prefix+suffix match, 2=fuzzy text match (chain verified)
    h[String(e.id)]=o;st_.emitted++;
  });
  const obj={v:1,source:'ThaqalaynData (narmafraz), CC0',book:'al-kafi',volume:v,h};
  const json=JSON.stringify(obj);fs.writeFileSync(`${OUT}/v${v}.json`,json);
  const gz=zlib.gzipSync(json).length;
  report[v]={...st_,rawBytes:Buffer.byteLength(json),gzBytes:gz,dsHadith:ds.length,dropped};
  console.log('v'+v,JSON.stringify({...st_,raw:Buffer.byteLength(json),gz}));
}
fs.writeFileSync('report.json',JSON.stringify(report));
