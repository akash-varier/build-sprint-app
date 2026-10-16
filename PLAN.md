\# PLAN.md  
1\. I can suggest recipes and portion sizes according to nutritional requirements (within a few grams) of individuals, and ingredients availability in the house. \- Verified  
2\. I can approve or reject with a tap of a reason for every single suggested menu. \- Now: built and verified; awaiting phone check.  
3\. I can create a list of groceries that have to be purchased at home based on the availability and the selection of the menu.  
4\. I can create a WhatsApp shareable link with portion sizes of the dishes prepared for each individual.  
5\. I can create a whatsapp shareable link with the cumulative suggested ingredients and cooking instructions.  
6\. I can understand liked dishes and suggest them again later  
7\. I can close it, reopen it, and my data is still there.  
8\. I can open a reference video for each dish.

Parked (not now):  
\- Learning continuously from the user’s actions to understand their preferences and conditions.   
\-Height, weight, and Goal (Calorie Surplus/ Calorie Deficit) included for assessment of macronutrient requirements.
\- Per-person sides. When household diets or allergies differ, keep one shared main dish and add a small side per person to close their protein gap (e.g. curd for the vegetarian, chicken for the non-vegetarian), each side checked against that person's own diet and allergies.

Cook-link requirement (milestone 5): Every dish includes a “Watch how to make it” button using shared/recipeVideo.ts to build https://www.youtube.com/results?search_query= plus the URL-encoded saved dish name and “ recipe”. Never request video URLs from AI. Cook link remains unbuilt until its milestone.

Approve/reject milestone: Each dish has a saved pending, accepted or rejected state. Reject requires a short reason (including Other text), saved before one charged AI call replaces only that item. Replacement keeps meal/role/cuisine, passes unchanged shared diet/allergy/80%/must-use checks, and uses the existing portion solver with other item weights fixed. Other dishes and portions remain exact; show new honest totals/gaps and preserve ±5 g. Replacement returns pending; retain rejection history. Failures keep the old rejected dish and reason with a retry option. Every dish must be accepted before Convex permits final submission to existing Ingredients. No handoff link in this milestone.
