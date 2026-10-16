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

Cook-link requirement (milestone 5): Every dish includes a “Watch how to make it” button using shared/recipeVideo.ts to build https://www.youtube.com/results?search_query= plus the URL-encoded saved dish name and “ recipe”. Never request video URLs from AI. Cook link remains unbuilt until its milestone.

Approve/reject milestone: Each dish has a saved pending, accepted or rejected state. Reject requires a short reason (including Other text), saved before one charged AI call replaces only that item. Replacement keeps meal/role/cuisine, passes unchanged shared diet/allergy/80%/must-use checks, and uses the existing portion solver with other item weights fixed. Other dishes and portions remain exact; show new honest totals/gaps and preserve ±5 g. Replacement returns pending; retain rejection history. Failures keep the old rejected dish and reason with a retry option. Every dish must be accepted before Convex permits final submission to existing Ingredients. No handoff link in this milestone.

Current milestone addition: Per-person sides. Keep shared dishes and their portions fixed. For each person/meal, when any macro is more than 5 g below 25% of that person’s daily target, select at most one personal side for the largest daily shortfall in grams. Use that recipient’s own diet/allergies with the unchanged ingredient safety predicate and 80% fridge coverage. Convex fits the side within the existing 25–40% meal range aims, daily upper budgets, per-item caps and remaining meal bread/roti allowances. Above-range macros stay visible. Show sides only for their recipient, include them once in meal/daily totals, and aggregate all raw ingredient shortages into Ingredients in existing natural units. Shared approve/reject states remain unchanged. Regenerating sides does not regenerate shared dishes.

Personal-side daily limits: Convex sizes sides against the remaining daily protein, carbs and fat budgets (target + 5 g), counting all personal sides together; fibre has no upper ceiling. Prioritise the largest daily shortfall within the existing eligible meals and 25–40% range aims. Try the proposed side and up to three different alternatives in the same AI request; omit the side only when none safely fits. Preserve shared dishes and their portions. An existing shared-only excess remains visible and sides cannot increase that macro. Confirmed diet/allergy checks, serving caps, 80% fridge rule and ±5 g daily pass rule stay unchanged.
