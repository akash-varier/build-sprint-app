export function recipeVideoUrl(dishName:string):string {
 return `https://www.youtube.com/results?search_query=${encodeURIComponent(dishName+' recipe')}`;
}
