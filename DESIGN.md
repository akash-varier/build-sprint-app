1. Screen: Notification  
   1. For: Remind the user to plan for the next day's meal  
   2. Top to Bottom: Message: Let's plan a meal for tomorrow.(Or something suggesting along similar lines, but then quirky)  
   3. Action: Click on the Notification \-\> Go to the App.  
2. Screen:Menu suggestion  
   1. For: Suggest a Menu for the user  
   2. Top to Bottom:  
      1. A small button on top to view the Shopping List  
      2. Breakfast Suggestion: Dish Image, Ingredients, with reference video link. Portions show in household measures (rotis, katoris), with grams in small text. Accept/ Reject (With selection from a set reasons)  
      3. Lunch Suggestion: Dish Image, Ingredients, with reference video link Accept/ Reject (With selection from a set reasons)  
      4. Dinner Suggestion: Dish Image, Ingredients, with reference video link Accept/ Reject (With selection from a set reasons)  
      5. Submit Response (Activated only after accept/ Reject of every dish)  
   3. Action: Submit Response  
   4. Next Screen:  
      1. If all are Accepted: Accepted, approved Flow  
      2. If even one dish is rejected, rejection flow  
   5. Empty, 1st Visit: A text intimating "Your curated menu is just a tap away"  
   6. Empty, Coming back: A text intimating "Ready to curate your menu for tomorrow?" more quirkily  
   7. Loading: Evaluating the whole family's nutritional requirements, building a curated menu, checking the refrigerator  
   8. Error: If AI cannot find any recipe with the suggested specific ingredients for sure: A message mentioning: "Seems like we have gone too particular on our ingredients, Let's try and remove\_\_\_\_\_ (AI suggested ingredient) from our list. Button to remove that selection of must use ingredients.  
   9. If AI times out. Message telling: Seems like I went in a circle. Can I start over real quick? Button: Generate again.  
   10. Done: Let's find out what we require for this meal. Button: Ingredients Intimation  
   11. AI wrong: Reasons for Rejection: Do not like the food type, not the cuisine in mind today, Too unhealthy/ cheesy,

   

   

   **Rejection Flow:**

3. Screen: Fridge Updation  
   1. For: The user to update what is available in the fridge and the must use ingredients.  
   2. Top to Bottom:  
      1. A small button on top to view the Shopping List  
      2. A list of things in the fridge listed out from the memory of the previous day. Each editable to be removed. A check box next to each item signalling that it has to be used for sure.   
      3. A possibility to add more items. On starting typing, suggestions of the item must come up. A check box next to each item signalling that it has to be used for sure. Each item has a unit picker (pieces, bunch, cup, katori, g, kg, ml, L). let each fridge item pick a unit (pieces, bunch, cup, katori, g, kg, ml, L), defaulting to the most natural unit per item (eggs = pieces, rice = cup). 
      4. A button to generate the menu.  
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
      1. A small button on top to view the Shopping List  
      2. A list of ingredients required with a quantity call out. Each of them has a checkbox to check off, to signal that the item has to be purchased.   
      3. A button to “Add checked items to Shopping List”  
   3. Action: Add checked items to Shopping List \-\> Portion Breakdown Link Sharing  
   4. Empty: Nothing to add for the day\! Let's get cooking\!  
   5. Loading: It is instant after she types add.  
   6. Error: Seems like I got that wrong. She get's an option to ask you to regenerate the result.  
   7. Done: "\_\_ items added to your list" (Update the number of items updated  
   8. AI wrong: If the quantity considered to the list is wrong, have a stepper (-/+) to play around with the quantity to add the correct amount to the Shopping List.

5. Screen: Portion Breakdown Link Sharing  
   1. For: To share a link that is shareable by them on WhatsApp to their Family, with their nutrition breakdown, and portion consumption requirements.   
   2. Top to Bottom:  
      1. A small button on top to view the Shopping List  
      2. An interactive representation to showcase to the user that everyone’s macronutrient targets are considered and portion sizes are thought through.   
      3. A sharable link with a share option, linking to WhatApp as an option for selection.   
      4. “Generate a handoff for the cook” button  
   3. Action: Share the link through WhatsApp \-\> Generate a cooking handoff  
6. Screen: Sharable portion Breakdown Link  
   1. For: To provide each person their portion breakdown for the planned dishes.  
   2. Top to Bottom:  
      1. Broken down into each family member \-\> Per meal \-\> macronutrient breakdown and portion suggestion for consumption.  
   3. Action: To be shared as a link to the family through WhatsApp  
7. Screen: Generate a Cooking Handoff  
   1. For: To share a link that is shareable by them on WhatsApp to their cook.  
   2. Top to Bottom:  
      1. A small button on top to view the Shopping List  
      2. Sharable link provided with an option to share, leading them to WhatsApp, and sharing with the cook.   
      3. Button to generate a menu again for the next few days.  
   3. Action: Share the link through WA to the cook \-\> Menu Suggestion  
8. Screen: Sharable Cooking Handoff  
   1. For: To provide the cook with all the instructions on how to cook the dishes  
   2. Top to Bottom:  
      1. Broken down into individual dishes:  
         1. Ingredients Required: With cumulative Quantity for all people,   
         2. Clickable reference video link.  
      2. Cumulative Ingredients Required.  
   3. Action: To be shared as a link to the cook through WhatsApp

9. Screen: Shopping List (Floating screen when the button to view the Shopping List is clicked from anywhere)  
   1. For: To always have a ready reference of the items to be shopped for. Easy access point to add and delete items at any moment as well.   
   2. Top to Bottom:  
      1. Every item that was added into the shopping list and has not been removed by the user, historically. Each having an option to be edited and striked off.   
      2. A plus option to add more items to the shopping list. With filling of the same, suggestions have to come up. Each having an option to be edited and striked off once added.

**Onboarding Flow**

10. Screen: 


Milestone 1 targets and menu update: In the temporary Family targets section on Fridge update, show household Breakfast, Lunch and Dinner cuisine pickers (Indian, Continental), saving each choice and restoring it on return. Initialise all three from existing personal cuisine text, preserving that text under the renamed “Likes or dislikes” field. This section moves to onboarding later. Menu shows each meal’s cuisine, main, staple and optional side, household measures first and grams small, and combined meal nutrition per person. Indian staples: rotis/rice; Continental: bread/toast/pasta/potatoes. Rotis and bread each cap at four per person per meal. Missing staples follow the existing 80% fridge rule, with all shortages shown on Ingredients as “need X more”; no fallback or blocking step.

Custom ingredient entry (milestone 1): Unknown names on Fridge can be added as typed. A Convex AI action estimates raw per-100-g protein, carbs, fat, fibre and calories, natural unit and grams per unit, diet and supported allergen tags. Show an editable AI estimate before explicit confirmation. Save confirmed ingredients per household for reuse in searches, menu requests, unit conversion and the same backend safety predicate. Uncertain allergens appear as initially unticked optional checkboxes. Only ticked allergens are saved and checked; unchecked uncertainty is discarded. AI lists uncertainty only for packaged or mixed products, never single raw ingredients such as atta, dal or vegetables. Confirmed allergen safety rules remain unchanged. Existing catalog ingredients are never overwritten; their estimate preview is separate. Preserve existing stock formats, portion caps, 80% availability and ±5 g rules. AI estimate calls count against existing call limits.
