import {customMeasure,type CustomFood} from '../../shared/ingredientEstimate';
import { foodById,type Stock } from '../../shared/food';
import { defaultUnit,supportedUnits,type FridgeEntry,type Unit } from '../../shared/units';
// Household reference sizes, not universal food weights. All quantity-to-gram
// arithmetic stays in Convex. Cup = 240 ml; katori = 150 ml. Raw ingredients.
const cupGrams:Record<string,number>={bread:60,pasta:140,rice:185,oats:80,atta:120,lentils:192,chickpeas:200,rajma:184,moong:200,paneer:150,tofu:240,milk:247.2,curd:245,egg:240,chicken:140,fish:140,potato:150,tomato:180,onion:160,spinach:30,carrot:130,peas:145,capsicum:150,cauliflower:100,broccoli:90,cucumber:120,banana:150,apple:125,lemon:200,oil:220.8,ghee:210,peanut:145,almond:140,sesame:145,ginger:100,garlic:135,cumin:100,turmeric:120,salt:288,water:240};
const pieceGrams:Record<string,number>={bread:30,egg:50,potato:150,tomato:120,onion:110,carrot:60,capsicum:150,cauliflower:600,broccoli:300,cucumber:200,banana:120,apple:180,lemon:60};
function factor(id:string,unit:Unit,custom:CustomFood[]=[]){
 const f=custom.find(f=>f.id===id);if(f){if(unit==='g')return 1;if(unit==='kg')return 1000;if(unit===f.estimate.unit)return f.estimate.gramsPerUnit;throw new Error('Choose a supported ingredient unit.');}
 if(!foodById.has(id)||!supportedUnits(id).includes(unit))throw new Error('Choose a suitable unit for this ingredient.');
 if(unit==='g')return 1;if(unit==='kg')return 1000;
 if(unit==='pieces')return pieceGrams[id];if(unit==='bunch')return 100;
 if(unit==='cup')return cupGrams[id];if(unit==='katori')return cupGrams[id]*150/240;
 const density=id==='oil'?0.92:id==='milk'?1.03:1;
 return density*(unit==='L'?1000:1);
}
export function toGrams(entry:FridgeEntry,custom:CustomFood[]=[]):number{
 if(!Number.isFinite(entry.quantity)||entry.quantity<=0)throw new Error('Enter a quantity greater than zero.');
 const grams=entry.quantity*factor(entry.id,entry.unit,custom);
 if(!Number.isFinite(grams)||grams>100000)throw new Error('Keep each fridge item at 100 kg or less.');return grams;
}
export function normalizeStock(entries:(Stock|FridgeEntry)[],custom:CustomFood[]=[]):Stock[]{
 return entries.map(e=> 'quantity' in e && e.quantity!==undefined && 'unit' in e && e.unit!==undefined ? {id:e.id,grams:toGrams(e as FridgeEntry,custom),mustUse:e.mustUse,quantity:e.quantity,unit:e.unit} : {...e} as Stock);
}
export function stockToEntries(stock:Stock[],custom:CustomFood[]=[]):FridgeEntry[]{
 return stock.map(s=>{if(s.quantity!==undefined&&s.unit!==undefined)return {id:s.id,quantity:s.quantity,unit:s.unit,mustUse:s.mustUse};
 const unit=custom.find(f=>f.id===s.id)?.estimate.unit??defaultUnit(s.id);return {id:s.id,quantity:s.grams/factor(s.id,unit,custom),unit,mustUse:s.mustUse};});
}
export function changeEntryUnit(entry:FridgeEntry,unit:Unit,custom:CustomFood[]=[]):FridgeEntry{
 return {...entry,unit,quantity:toGrams(entry,custom)/factor(entry.id,unit,custom)};
}
export function unitHint(id:string,unit:Unit):string{
 if(unit==='g'||unit==='kg')return 'Weight in grams or kilograms.';
 const grams=Math.round(factor(id,unit)*10)/10;
 return `Approx. ${grams} g per ${unit==='pieces'?(id==='bread'?'slice':'piece'):unit}. ${unit==='cup'?'Cup: 240 ml.':unit==='katori'?'Katori: 150 ml.':''}`.trim();
}

export function naturalAmount(id:string,grams:number,custom:CustomFood[]=[]):string {
 const f=custom.find(f=>f.id===id);if(f)return customMeasure(f,grams);
 const unit=defaultUnit(id);const quantity=grams/factor(id,unit);
 const amount=unit==='pieces'?Math.ceil(quantity-1e-9):Math.ceil(quantity*100-1e-9)/100;
 return `${amount} ${id==='bread'&&unit==='pieces'?(amount===1?'slice':'slices'):unit==='pieces'&&amount===1?'piece':unit==='bunch'&&amount!==1?'bunches':unit==='cup'&&amount!==1?'cups':unit}`;
}

// Menu-only display: these rounded references never feed portions or cooking grams.
const kitchenFractions=[0,1/4,1/3,1/2,3/4,1];
function kitchenNumber(n:number,fractions=kitchenFractions){
 const whole=Math.floor(n),fraction=fractions.reduce((best,f)=>Math.abs(f-(n-whole))<Math.abs(best-(n-whole))?f:best,0);
 if(fraction===1)return String(whole+1);
 const glyph=fraction===1/8?'⅛':fraction===1/4?'¼':fraction===1/3?'⅓':fraction===1/2?'½':fraction===3/4?'¾':'';
 return `${whole||!glyph?whole:''}${glyph}`;
}
function spoonAmount(cups:number){
 const tablespoons=cups*16;
 if(tablespoons>=1){const n=Math.round(tablespoons*2)/2;return `About ${kitchenNumber(n)} tbsp`;}
 return `About ${kitchenNumber(Math.max(.25,Math.round(cups*48*4)/4))} tsp`;
}
export function menuIngredientAmount(id:string,grams:number,custom:CustomFood[]=[]):string{
 if(grams===0)return naturalAmount(id,grams,custom);
 const f=custom.find(f=>f.id===id),name=f?.name.toLowerCase()??foodById.get(id)?.name.toLowerCase()??id;
 if(id==='spinach'||/\b(spinach|methi|coriander leaves|cilantro|mint|parsley|dill|basil|herbs?)\b/.test(name)){
  if(grams<37.5)return 'About a handful';
  const bunches=Math.max(.5,Math.round(grams/100*2)/2);return `About ${kitchenNumber(bunches)} ${bunches<=1?'bunch':'bunches'}`;
 }
 if(['oil','ghee'].includes(id)||/\b(oil|ghee|butter)\b/.test(name))return spoonAmount(grams/(cupGrams[id]??(name.includes('butter')?227:220.8)));
 if(['ginger','garlic','cumin','turmeric','salt'].includes(id)||/\b(spices?|salt|sugar|paste|powder|pepper|chilli|chili|cumin|turmeric|masala|coriander seeds?)\b/.test(name)){
  const cups=grams/(cupGrams[id]??(name.includes('sugar')?200:120));return cups*48<.125?'About a pinch':spoonAmount(cups);
 }
 const chopped=/\b(chopped|diced|sliced|grated)\b/.test(name);
 const count=['onion','tomato','egg','bread','banana','apple','lemon'].includes(id)||f?.estimate.unit==='pieces';
 if(count&&!chopped){const each=f?.estimate.gramsPerUnit??pieceGrams[id],n=Math.max(.5,Math.round(grams/each*2)/2);return `About ${kitchenNumber(n)} ${id==='bread'?(n<=1?'slice':'slices'):n<=1?'piece':'pieces'}`;}
 let cup=cupGrams[id];
 if(f){
  const reference=/\b(dal|lentils?|chana|chickpeas?|rajma|beans?|moong)\b/.test(name)?'lentils':/\b(atta|flour|maida)\b/.test(name)?'atta':/\b(rice|grains?|sooji|semolina|quinoa|millet|ragi|jowar|bajra|poha|daliya|oats|wheat|barley|corn)\b/.test(name)?'rice':/\b(milk)\b/.test(name)?'milk':/\b(curd|yogurt|yoghurt)\b/.test(name)?'curd':/\b(tomato|onion|carrot|broccoli|cauliflower|peas|potato|capsicum|cucumber)\b/.exec(name)?.[0];
  cup=reference?cupGrams[reference]:chopped?150:0;
  if(cup&&f.estimate.unit==='katori')cup=f.estimate.gramsPerUnit*240/150;
 }
 const cupType=chopped||(!f&&(['milk','curd','potato','carrot','peas','capsicum','cauliflower','broccoli','cucumber'].includes(id)||defaultUnit(id)==='cup'))||!!f&&!!cup;
 if(cupType&&cup){
  const cups=grams/cup;
  if(cups<1/8)return `About ${kitchenNumber(Math.round(cups*16*2)/2)} tbsp`;
  const n=kitchenNumber(cups,[0,1/8,1/4,1/3,1/2,3/4,1]);return `About ${n} ${['⅛','¼','⅓','½','¾','1'].includes(n)?'cup':'cups'}`;
 }
 return naturalAmount(id,grams,custom);
}
