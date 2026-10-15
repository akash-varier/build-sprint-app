export const units=['pieces','bunch','cup','katori','g','kg','ml','L'] as const;
export type Unit=typeof units[number];
export type FridgeEntry={id:string;quantity:number;unit:Unit;mustUse:boolean};
const pieceFoods=new Set(['bread','egg','potato','tomato','onion','carrot','capsicum','cauliflower','broccoli','banana','apple','lemon','cucumber']);
const bunchFoods=new Set(['spinach']);
const cupFoods=new Set(['pasta','rice','oats','atta','lentils','chickpeas','rajma','moong','peas']);
const liquidFoods=new Set(['milk','oil','water']);
export function defaultUnit(id:string):Unit {
 if(pieceFoods.has(id))return 'pieces';if(bunchFoods.has(id))return 'bunch';if(cupFoods.has(id))return 'cup';
 if(id==='milk'||id==='water')return 'L';if(id==='oil')return 'ml';if(id==='chicken'||id==='fish')return 'kg';return 'g';
}
export function supportedUnits(id:string):Unit[]{
 return units.filter(u=>u==='g'||u==='kg'||u==='cup'||u==='katori'||(u==='pieces'&&pieceFoods.has(id))||(u==='bunch'&&bunchFoods.has(id))||((u==='ml'||u==='L')&&liquidFoods.has(id)));
}
export function newFridgeEntry(id:string):FridgeEntry{
 const unit=defaultUnit(id);return {id,unit,quantity:unit==='g'?100:unit==='ml'?100:unit==='kg'?0.5:1,mustUse:false};
}
