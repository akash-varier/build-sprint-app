import type {Food} from '../../shared/food';
// Saved custom foods use the same existing serving categories as catalogue foods.
export function servingAliases(catalog:Food[]){return Object.fromEntries(catalog.flatMap(f=>{
 if(!f.id.startsWith('custom_'))return [];
 const n=f.name.toLowerCase();const id=/\b(oil|olive oil)\b/.test(n)?'oil':/\bghee\b/.test(n)?'ghee':/\b(chicken)\b/.test(n)?'chicken':/\bpaneer\b/.test(n)?'paneer':/\b(peanuts?|groundnuts?)\b/.test(n)?'peanut':/\balmonds?\b/.test(n)?'almond':/\bsesame\b/.test(n)?'sesame':null;
 return id?[[f.id,id]]:[];
}));}
