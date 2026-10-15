\# AGENTS.md

\#\# 1\. How the product works  
Interface: Web app opened by link click on mobile. They would update the ingredients available at home, their profile, and their preferences. They would also view menu suggestions and shopping lists, and access links to be sent across to multiple people.  
Business logic: When they input ingredients, it is supposed to be updated to the database (Convex database)And this should be considered during the decision of menu making. Any personal profile input should be saved again into the Convex database, and it should be run through during menu selection.Once it receives a menu update from either The database or from the gpt-6-luna model, update the menu information on the interface with the portion breakdown per family member.  
Database: It should remember individual profiles (Multiple in a single household): macronutrient requirements, allergies, preferences. It should remember the macronutrient breakdown of the dishes that were accepted.  
Third party: gpt-6-luna writes the menu, its key is stored in Convex, and the call runs in a Convex action.  
In a later milestone: Searching for video references on the web will come up.  
Not in v1: Including expiry date and ripe meter in the app  
Photo to upload the addition of ingredients in the fridge  
Feedback through voice on menu suggestions.  
WhatsApp integration to directly send the ingredients to the cook.

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

\#\# 2\. How we work  
\- Read IDEA\_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.  
\- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.  
\- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.  
\- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.  
\- Never say "done" until you've seen it work (a test, or a screenshot at phone width) and told me how to check it on my phone.  
\- When I report a bug, find the cause before changing anything. Fix only that.  
\- When we add something new, write tests so what already works doesn't break. When I drop a feature, drop its tests.  
\- Build and test only in \[where my users will use it: WhatsApp, the web, ...\]. No web test page for a product that lives somewhere else.  
\- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.  
\- Never put a key or password in code, in a VITE\_ variable (those are sent to every visitor) or in a committed file.

\#\# 3\. Shipping  
Live link: Not yet deployed.  
Repo: Not created yet  
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.  
Keys: OPENAI\_API\_KEY lives in Convex environment variables, set for dev and for prod. Never in code, a VITE\_ variable or a committed file. Never ask me to paste it into chat.  
.gitignore covers .env.local.  
Real people's data (chats, names, phone numbers) never goes in the repo, not even as a test file. Tests use made-up examples.  
Every limit and every "is this allowed" check happens in a Convex function, never only on screen.  
Before I share the link: I open it on my phone, log out, on mobile data, and do the core flow once.

\#\# 4\. The AI call

Model: gpt-6-luna, thinking: Low  
What goes in, and its limit: The cumulative macronutrient requirement from convex, cumulative preferences and individual people’s allergies from Convex. A list of ingredients available from the interface. At most 300 words.  
What comes back: Breakfast, Lunch, and dinner suggestions considering all the member’s preferences and allergies. Ingredients with the quantity required. Weight and macronutrient breakdown of the dish with the mentioned quantity of ingredients. At least 80% of each dish's ingredients come from the user’s ingredients available list  
Where it runs: a Convex action. Never in the interface.  
Key: OPENAI\_API\_KEY in Convex environment variables, dev and prod.  
Reply cap: max\_output\_tokens 4000  
Calls cap: at most 100 AI calls an hour across the app, checked in the kitchen (Convex rate limiter)  
Provider limit: a hard monthly limit of \$50, set by me  
When a cap is hit or the call fails: show "Busy right now. Try again in a few minutes."  
Login: none in v1  
The AI must never: Answer off topic, suggest a dish that contains someone's allergen, 
V1 nutrition tolerance: ±5 g per person for each daily macro (protein, carbs, fat and fibre). Convex calculates individual portions; AI only returns dishes, batch weights and batch macros.


V1 portion and ingredient rules:
- Ingredients lead with natural raw units using the Fridge conversion references. Eggs and tomatoes round up to whole pieces; rice and dal use cups; spinach uses bunches. Show exact calculated raw grams in smaller text. Display rounding never changes cooking quantities or nutrition.
- Each meal aims for 25–40% of each person's daily protein, carbs, fat and fibre target. Serving caps are hard limits; meal ranges may be missed when impossible. Convex first minimises the largest meal-range miss (as a share of the daily target), then fits daily totals within the remaining feasible portions. Show signed per-macro meal range gaps and daily actual-minus-target gaps.
- Per person per meal: at most 4 eggs (200 g raw egg), 2 cups cooked rice (316 g), and 3 katoris of any single dish (450 g). Conservatively apply the 316 g limit to the entire rice-containing dish. Caps are checked in Convex from ingredient quantities and cooked batch weights. Never enlarge a portion beyond a cap to close a gap. No minimum serving may override a cap.
- If daily gaps exceed ±5 g or meal ranges are missed, allow one AI replacement attempt for different dishes and ingredient mixes, not resized copies. Keep the better safe capped plan. At most two AI calls per generation; every call, including the replacement, counts against existing global and household limits. If the replacement fails or cannot be charged, retain the first safe capped menu and show its gaps.
- Preserve the ±5 g daily pass check and all existing diet/allergy rules. Dishes remain shared: every ingredient must be allowed for every person. Dairy and meat cannot be used as person-specific additions in this milestone. AI still returns whole-dish weights/macros; only Convex calculates portions.
