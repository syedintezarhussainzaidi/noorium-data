const fs=require('fs');
const R='tdata/books/al-kafi';
function norm(s){
  s=s.replace(/\([^)]*\)/g,' ');            // drop parenthetical salawat
  s=s.replace(/^[\s\d\u0660-\u0669\-–.]+/,''); // leading numbering
  s=s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,''); // diacritics, tatweel
  s=s.replace(/[\u0622\u0623\u0625\u0671]/g,'\u0627'); // alef forms
  s=s.replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647').replace(/\u06CC/g,'\u064A').replace(/\u06A9/g,'\u0643');
  s=s.replace(/[^\u0621-\u063A\u0641-\u064A]/g,''); // keep base arabic letters only
  s=s.replace(/(عليهما|عليهم|عليها|عليه)السلام/g,'').replace(/صلىاللهعليهوآله|صلياللهعليهواله/g,'');
  return s;
}
function loadDs(v){
  const arr=[];
  for(const b of fs.readdirSync(`${R}/${v}`)){
    const bp=`${R}/${v}/${b}`; if(!fs.statSync(bp).isDirectory())continue;
    for(const c of fs.readdirSync(bp)){
      const cp=`${bp}/${c}`; if(!fs.statSync(cp).isDirectory())continue;
      for(const h of fs.readdirSync(cp)) if(/^\d+\.json$/.test(h)){
        const j=JSON.parse(fs.readFileSync(`${cp}/${h}`,'utf8'));
        const vs=j.data.verse;
        const chainTxt=(vs.narrator_chain?vs.narrator_chain.parts.map(p=>p.text).join(''):'');
        const full=chainTxt+' '+(vs.text||[]).join(' ');
        arr.push({key:`${+b}:${+c}:${parseInt(h)}`,b:+b,c:+c,h:parseInt(h),vs,gr:j.data.gradings||vs.gradings,full});
      }
    }
  }
  return arr;
}
module.exports={norm,loadDs};
