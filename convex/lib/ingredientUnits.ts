import { foodById,type Stock } from '../../shared/food';
import { defaultUnit,supportedUnits,type FridgeEntry,type Unit } from '../../shared/units';
// Household reference sizes, not universal food weights. All quantity-to-gram
// arithmetic stays in Convex. Cup = 240 ml; katori = 150 ml. Raw ingredients.
const cupGrams:Record<string,number>={rice:185,oats:80,atta:120,lentils:192,chickpeas:200,rajma:184,moong:200,paneer:150,tofu:240,milk:247.2,curd:245,egg:240,chicken:140,fish:140,potato:150,tomato:180,onion:160,spinach:30,carrot:130,peas:145,capsicum:150,cauliflower:100,broccoli:90,cucumber:120,banana:150,apple:125,lemon:200,oil:220.8,ghee:210,peanut:145,almond:140,sesame:145,ginger:100,garlic:135,cumin:100,turmeric:120,salt:288,water:240};
const pieceGrams:Record<string,number>={egg:50,potato:150,tomato:120,onion:110,carrot:60,capsicum:150,cauliflower:600,broccoli:300,cucumber:200,banana:120,apple:180,lemon:60};
function factor(id:string,unit:Unit){
 if(!foodById.has(id)||!supportedUnits(id).includes(unit))throw new Error('Choose a suitable unit for this ingredient.');
 if(unit==='g')return 1;if(unit==='kg')return 1000;
 if(unit==='pieces')return pieceGrams[id];if(unit==='bunch')return 100;
 if(unit==='cup')return cupGrams[id];if(unit==='katori')return cupGrams[id]*150/240;
 const density=id==='oil'?0.92:id==='milk'?1.03:1;
 return density*(unit==='L'?1000:1);
}
export function toGrams(entry:FridgeEntry):number{
 if(!Number.isFinite(entry.quantity)||entry.quantity<=0)throw new Error('Enter a quantity greater than zero.');
 const grams=entry.quantity*factor(entry.id,entry.unit);
 if(!Number.isFinite(grams)||grams>100000)throw new Error('Keep each fridge item at 100 kg or less.');return grams;
}
export function normalizeStock(entries:(Stock|FridgeEntry)[]):Stock[]{
 return entries.map(e=> 'quantity' in e && e.quantity!==undefined && 'unit' in e && e.unit!==undefined ? {id:e.id,grams:toGrams(e as FridgeEntry),mustUse:e.mustUse,quantity:e.quantity,unit:e.unit} : {...e} as Stock);
}
export function stockToEntries(stock:Stock[]):FridgeEntry[]{
 return stock.map(s=>{if(s.quantity!==undefined&&s.unit!==undefined)return {id:s.id,quantity:s.quantity,unit:s.unit,mustUse:s.mustUse};
 const unit=defaultUnit(s.id);return {id:s.id,quantity:s.grams/factor(s.id,unit),unit,mustUse:s.mustUse};});
}
export function changeEntryUnit(entry:FridgeEntry,unit:Unit):FridgeEntry{
 return {...entry,unit,quantity:toGrams(entry)/factor(entry.id,unit)};
}
export function unitHint(id:string,unit:Unit):string{
 if(unit==='g'||unit==='kg')return 'Weight in grams or kilograms.';
 const grams=Math.round(factor(id,unit)*10)/10;
 return `Approx. ${grams} g per ${unit==='pieces'?'piece':unit}. ${unit==='cup'?'Cup: 240 ml.':unit==='katori'?'Katori: 150 ml.':''}`.trim();
}

export function naturalAmount(id:string,grams:number):string {
 const unit=defaultUnit(id);const quantity=grams/factor(id,unit);
 const amount=unit==='pieces'?Math.ceil(quantity-1e-9):Math.ceil(quantity*100-1e-9)/100;
 return `${amount} ${unit==='pieces'&&amount===1?'piece':unit==='bunch'&&amount!==1?'bunches':unit==='cup'&&amount!==1?'cups':unit}`;
}
