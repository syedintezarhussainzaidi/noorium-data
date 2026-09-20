// Reference implementation of the Noorium Al-Kafi isnad KEY + verification token.
// KEY   = String(entry.id) from https://www.thaqalayn-api.net/api/<bookId>/<number>, file = v<N>.json where N is
//         the volume number in entry.bookId ("Al-Kafi-Volume-<N>-Kulayni").
// TOKEN = 4 lowercase hex chars = (FNV-1a-32 over UTF-8 code points of the first 24 letters of norm(arabicText)) & 0xFFFF.
//         Use it to reject a mapping if the API ids ever shift: if token != h[key].t, do NOT draw the chain.
function norm(s){
  s=s.replace(/\([^)]*\)/g,' ');                                   // 1. drop parenthesised text, e.g. (عَلَيْهِ السَّلام)
  s=s.replace(/^[\s\d\u0660-\u0669\-\u2013.]+/,'');                 // 2. drop leading hadith number / dash
  s=s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,''); // 3. drop diacritics, dagger alef, tatweel
  s=s.replace(/[\u0622\u0623\u0625\u0671]/g,'\u0627');             // 4. all alef forms -> ا
  s=s.replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647').replace(/\u06CC/g,'\u064A').replace(/\u06A9/g,'\u0643'); // 5. ى->ي ة->ه ی->ي ک->ك
  s=s.replace(/[^\u0621-\u063A\u0641-\u064A]/g,'');                 // 6. keep only base Arabic letters
  s=s.replace(/(\u0639\u0644\u064A\u0647\u0645\u0627|\u0639\u0644\u064A\u0647\u0645|\u0639\u0644\u064A\u0647\u0627|\u0639\u0644\u064A\u0647)\u0627\u0644\u0633\u0644\u0627\u0645/g,''); // 7. drop (عليه|عليهما|عليهم|عليها)+السلام
  s=s.replace(/صلياللهعليهواله/g,'');                              // 8. drop "صلى الله عليه واله" (after steps 4-6 it is this letter string)
  return s;
}
function fnv1a32(str){let h=0x811c9dc5;for(const ch of str){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h}
function token(arabicText){return (fnv1a32(norm(arabicText).slice(0,24))&0xffff).toString(16).padStart(4,'0')}
module.exports={norm,token};
if(require.main===module){for(const t of process.argv.slice(2))console.log(JSON.stringify({norm:norm(t),token:token(t)}))}
