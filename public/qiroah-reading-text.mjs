// Harakat can disappear without changing decomposed hamza/madda into alif.
export const hideVowels=value=>value.replace(/[\u064B-\u0652\u0670]/gu,'');

export function finalVowel(word){
  const last=word.match(/[\p{L}][\p{M}]*$/u)?.[0]||'';
  const endings=last.match(/[\u064B-\u0650\u0652]/gu)||[];
  return endings.length===1?({'َ':'a','ِ':'i','ُ':'u'}[endings[0]]||null):null;
}
