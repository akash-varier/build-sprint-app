1. Screen: Notification  
   1. For: Remind the user to plan for the next day's meal  
   2. Top to Bottom: Message: Let's plan a meal for tomorrow.(Or something suggesting along similar lines, but then quirky)  
   3. Action: Click on the Notification \-\> Go to the App.  
2. Screen:Menu suggestion  
   1. For: Suggest a Menu for the user  
   2. Top to Bottom:  
      1. Breakfast Suggestion: Dish Image, Ingredients, with reference video link. Portions show in household measures (rotis, katoris), with grams in small text. Accept/ Reject (With selection from a set reasons)  
      2. Lunch Suggestion: Dish Image, Ingredients, with reference video link Accept/ Reject (With selection from a set reasons)  
      3. Dinner Suggestion: Dish Image, Ingredients, with reference video link Accept/ Reject (With selection from a set reasons)  
      4. Submit Response (Activated only after accept/ Reject of every dish)  
   3. Action: Submit Response  
   4. Next Screen:  
      1. If all are Accepted: Accepted, approved Flow  
      2. If even one dish is rejected, only the rejected dish is replaced by considering the required targets and rejection reason. the replacement dish comes back with its own Accept/Reject, so she never ends up stuck with a dish she didn't choose.  
   5. Empty, 1st Visit: A text intimating "Your curated menu is just a tap away"  
   6. Empty, Coming back: A text intimating "Ready to curate your menu for tomorrow?" more quirkily  
   7. Loading: Evaluating the whole family's nutritional requirements, building a curated menu, checking the refrigerator  
   8. Error: If AI cannot find any recipe with the suggested specific ingredients for sure: A message mentioning: "Seems like we have gone too particular on our ingredients, Let's try and remove\_\_\_\_\_ (AI suggested ingredient) from our list. Button to remove that selection of must use ingredients.  
   9. If AI times out. Message telling: Seems like I went in a circle. Can I start over real quick? Button: Generate again.  
   10. Done: Let's find out what we require for this meal. Button: Ingredients Intimation  
   11. AI wrong: Reasons for Rejection: Do not like the food type, not the cuisine in mind today, Too unhealthy/ cheesy, and Other (with a text box to fill if selected)

   

   

   **Rejection Flow:**

3. Screen: Fridge Updation  
   1. For: The user to update what is available in the fridge and the must use ingredients.  
   2. Top to Bottom:  
      1. A list of things in the fridge listed out from the memory of the previous day. Each editable to be removed. A check box next to each item signalling that it has to be used for sure.   
      2. A possibility to add more items. On starting typing, suggestions of the item must come up. A check box next to each item signalling that it has to be used for sure. Each item has a unit picker (pieces, bunch, cup, katori, g, kg, ml, L). let each fridge item pick a unit (pieces, bunch, cup, katori, g, kg, ml, L), defaulting to the most natural unit per item (eggs = pieces, rice = cup). 
      3. A button to generate the menu.  
   3. Action: Generate Menu \-\> Menu Suggestion   
   4. Empty, first visit: "How about we start with what we have at home?" A few suggestions that she can just click and add. These would be the common ones. Then a \+ button to add items, with suggestions coming as she types.  
   5. Empty, coming back: Let's start off with yesterday's list and add on from there?  
   6. Loading: Curating the menu around what we have, and what we need\!  
   7. Error: Suggest the closest match the first time, and if she presses x and types again, take the entry as it is.  
   8. Done: We have our chef's special menu ready. Menu Suggestion  
   9. AI wrong: If the autocomplete suggests the wrong item: She has an x symbol button beside every ingredient through which she can easily cancel the ingredient.

   

   **Approved Flow**

4. Screen: Ingredients Intimation.  
   1. For: To show the user the ingredients required to make the meals and curate the items into the shopping list based on what is not available.   
   2. Top to Bottom:    
      1. A list of ingredients required with a quantity call out. Each of them has a checkbox to check off, to signal that the item has to be purchased.   
      2. A button to “Add checked items to Shopping List”  
   3. Action: Add checked items to Shopping List \-\> Portion Breakdown Link Sharing  
   4. Empty: Nothing to add for the day\! Let's get cooking\!  
   5. Loading: It is instant after she types add.  
   6. Error: Seems like I got that wrong. She get's an option to ask you to regenerate the result.  
   7. Done: "\_\_ items added to your list" (Update the number of items updated  
   8. AI wrong: If the quantity considered to the list is wrong, have a stepper (-/+) to play around with the quantity to add the correct amount to the Shopping List.
 
5. Screen: Sharable Cooking and Portion Split Handoff
   1. For: To provide the cook and family with all the instructions on how to cook the dishes (Ingredients, quantity, cooking instructions and a button to look at a cooking video reference), the family's individually split portion sizes for every meal, and a breakdown of consumption vs requirements. (Macronutrients)  
   2. Top to Bottom:  
      1. Broken down into individual dishes:  
         1. Ingredients Required: With cumulative Quantity for all people
	 2. Portion Breakdown per person with macronutrient breakdown for the suggestion
	 3. Cooking Instructions
	 4. Button to watch the reference video on Youtube
      2. Broken down into each family member
	 1. Macronutrient target vs actual. 
   3. Action: To be shared as a link to the cook and family members through WhatsApp
   4. Empty: This menu has changed, ask for a fresh link
   5. Loading: "Getting Today's Menu..."
   6. Error: Couldn't Load. Tap to Retry"


Not in V1:

9. Screen: Shopping List (Floating screen when the button to view the Shopping List is clicked from anywhere)  
   1. For: To always have a ready reference of the items to be shopped for. Easy access point to add and delete items at any moment as well.   
   2. Top to Bottom:  
      1. Every item that was added into the shopping list and has not been removed by the user, historically. Each having an option to be edited and striked off.   
      2. A plus option to add more items to the shopping list. With filling of the same, suggestions have to come up. Each having an option to be edited and striked off once added.

**Onboarding Flow**




Milestone 1 targets and menu update: In the temporary Family targets section on Fridge update, show household Breakfast, Lunch and Dinner cuisine pickers (Indian, Continental), saving each choice and restoring it on return. Initialise all three from existing personal cuisine text, preserving that text under the renamed “Likes or dislikes” field. This section moves to onboarding later. Menu shows each meal’s cuisine, main, staple and optional side, household measures first and grams small, and combined meal nutrition per person. Indian staples: rotis/rice; Continental: bread/toast/pasta/potatoes. Rotis and bread each cap at four per person per meal. Missing staples follow the existing 80% fridge rule, with all shortages shown on Ingredients as “need X more”; no fallback or blocking step.

Custom ingredient entry (milestone 1): Unknown names on Fridge can be added as typed. A Convex AI action estimates raw per-100-g protein, carbs, fat, fibre and calories, natural unit and grams per unit, diet and supported allergen tags. Show an editable AI estimate before explicit confirmation. Save confirmed ingredients per household for reuse in searches, menu requests, unit conversion and the same backend safety predicate. Uncertain allergens appear as initially unticked optional checkboxes. Only ticked allergens are saved and checked; unchecked uncertainty is discarded. AI lists uncertainty only for packaged or mixed products, never single raw ingredients such as atta, dal or vegetables. Confirmed allergen safety rules remain unchanged. Existing catalog ingredients are never overwritten; their estimate preview is separate. Preserve existing stock formats, portion caps, 80% availability and ±5 g rules. AI estimate calls count against existing call limits.

Menu dish cards: Show “Watch how to make it” beneath the saved dish name. Open a YouTube search in a new tab, building the encoded query from that name plus “ recipe” in code. No AI video URLs. Apply the same button to dishes on the future cook link when milestone 5 is built.
