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
What comes back: Breakfast, Lunch, and dinner suggestions considering all the member’s preferences and allergies. Ingredients with the quantity required. Weight and macronutrient breakdown of the dish with the mentioned quantity of ingredients. Prefer stocked ingredients, but allow buying whenever it improves the fit within safety and cuisine rules.
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
- Per person per item: at most 4 eggs (200 g raw egg), 2 cups cooked rice (316 g), and 3 katoris (450 g). Conservatively apply the rice limit to the entire rice-containing item. Bread additionally has a combined limit of 4 slices per person per meal (30 g reference slice; 120 g raw bread). These caps do not limit the combined meal weight. Caps are checked in Convex; rounding cannot override them. Never enlarge an item beyond a cap to close a gap.
- If daily gaps exceed ±5 g or meal ranges are missed, allow one AI replacement attempt for different dishes and ingredient mixes, not resized copies. Keep the better safe capped plan. At most two shared-menu AI calls plus one personal-side AI call per generation; every call, including the replacement, counts against existing global and household limits. If the replacement fails or cannot be charged, retain the first safe capped menu and show its gaps.
- Preserve the ±5 g daily pass check and all existing diet/allergy rules. Shared dishes remain safe for everyone: every shared ingredient must be allowed for every person. Personal sides may contain dairy or meat only when allowed for their recipient. AI still returns whole-dish weights/macros; only Convex calculates portions.

Meal composition (milestone 1): Each meal has one shared main, one shared staple and at most one shared side. Household cuisine is saved separately for Breakfast, Lunch and Dinner (North Indian, South Indian, Continental, Italian, Chinese / Indo-Chinese, Mediterranean, Mexican or Thai; retain legacy saved Indian), defaulting to the last saved choice. Initially migrate the first existing personal cuisine value into all three choices; otherwise default to North Indian. Preserve all personal preference text under “Likes or dislikes”; ignore legacy cuisine-only text when prompting. These temporary targets controls move to onboarding later.
Indian staples are rotis or rice. Continental staples are bread, toast, pasta or potatoes. Missing staples are allowed without an availability coverage requirement; do not add a fallback or blocking step. Every shortage appears on Ingredients as “need X more”. Every item remains safe for the whole household.
Convex alone calculates all item portions together. The 25–40% ranges apply to combined meal macros; preserve honest signed daily gaps and the ±5 g pass rule. Existing per-item caps remain unchanged. Additionally, rotis total at most 4 (40 g cooked reference each), and bread totals at most 4 slices (30 g raw reference each), per person per meal. Main/staple minimums remain 50 g/25 g, reduced when capped lower; optional sides may be zero. Never inflate portions to close gaps. At most one AI replacement attempt, charged against existing limits.
Bread is plain milk/egg-free; pasta is egg-free. Both retain wheat/gluten checks. Bread uses pieces labelled slices. Existing menus remain readable; group items and combined nutrition checks by meal.

Custom ingredient entry (milestone 1): Unknown names on Fridge can be added as typed. A Convex AI action estimates raw per-100-g protein, carbs, fat, fibre and calories, natural unit and grams per unit, diet and supported allergen tags. Show an editable AI estimate before explicit confirmation. Save confirmed ingredients per household for reuse in searches, menu requests, unit conversion and the same backend safety predicate. Uncertain allergens appear as initially unticked optional checkboxes. Only ticked allergens are saved and checked; unchecked uncertainty is discarded. AI lists uncertainty only for packaged or mixed products, never single raw ingredients such as atta, dal or vegetables. Confirmed allergen safety rules remain unchanged. Existing catalog ingredients are never overwritten; their estimate preview is separate. Preserve existing stock formats, portion caps, buying permission and daily macro rules. AI estimate calls count against existing call limits.

Cuisine/unit update: New cuisine pickers offer North Indian, South Indian, Continental, Italian, Chinese / Indo-Chinese, Mediterranean, Mexican and Thai. Retain existing saved Indian values as Indian (saved choice), without rewriting them; new households default to North Indian. Generation and one-dish replacements follow the selected cuisine using the same compatibility mapping. Menu dish ingredient lines lead with the same Convex natural raw measures as Fridge/Ingredients, with raw grams in smaller text. Labels never change recipe quantities, portions, caps, allergy/diet rules or ±5 g checks.

Per-person sides (current milestone): Keep shared main recipes/portions and approve/reject states fixed; individual staple servings may shrink to avoid daily carb excess. Add at most one side per person per meal when a daily macro shortfall exceeds 5 g and that meal has room within the existing range aims; target the biggest daily gram shortfall. Code calculates its capped cooked portion; AI returns only batch recipes/macros. Check ingredient diet/allergy tags only against its recipient using the unchanged predicate. Missing ingredients are permitted for every shared dish and side. Missing ingredients/quantities join the combined Ingredients shortages in the same natural units. Per-item caps remain firm; bread/roti meal caps include shared items plus the personal side. Leave excesses/gaps honest and retain ±5 g daily acceptance. Sides appear only in their recipient’s meal portion and count once in meal/daily totals. After shared dish replacement, refresh sides only for that meal; other personal sides can only shrink or be omitted if needed to preserve daily upper budgets. One personal-side AI call is separately charged to existing 100/hour and household 3/min limits, in addition to existing bounded shared-menu calls. Existing saved menus remain readable; failed side planning keeps shared dishes and allows retry.

Personal-side daily limits: Convex sizes sides against the remaining daily protein, carbs and fat budgets (target + 5 g), counting all personal sides together; fibre has no upper ceiling. Prioritise the largest daily shortfall within the existing eligible meals and 25–40% range aims. Try the proposed side and up to three different alternatives in the same AI request; omit the side only when none safely fits. Preserve shared dishes and their portions. Shrink only the person’s staple serving when possible to avoid carb excess before fitting sides; remaining unavoidable excess stays visible and sides cannot increase that macro. Confirmed diet/allergy checks, serving caps, buying permission and daily macro pass rule apply.

Menu planning priority: (1) allergies and diet, never broken; (2) household meal cuisine and personal preferences; (3) daily protein/carbs/fat within ±5 g and fibre at least target − 5 g, with no fibre upper limit; (4) fridge use. The 80% fridge coverage requirement is removed for shared dishes, replacements and personal sides. Buying is allowed; all positive non-water shortages appear under “Need to buy” in existing natural units. When shortages exist, Menu says exactly “A few items need buying to hit everyone's targets.” Serving caps, backend safety checks and approve/reject workflow stay unchanged. Convex may shrink only a person’s staple serving to make carb room, including below the old staple minimum; shared recipe proportions stay fixed. Sides still use code-calculated portions, daily upper budgets and the proposed side plus up to three alternatives in one counted request. Remaining gaps are honest.

Cooking handoff: one accepted-menu link and one read-only /handoff/<random-256-bit-token> page; the URL never includes the owner household token. Store share snapshots in a separate Convex table. Always enforce full acceptance and current menu/portion/side version in Convex for creation and reads. Never patch household/menu/review data when creating a handoff. Methods use one separately counted low-thinking gpt-6-luna call with the existing 4000 output-token cap; cache the link for that accepted menu. Methods cannot set serving quantities; use saved portion labels. Never request video URLs. Public payload excludes stock, allergies, preferences and owner credentials; include only the requested names, recipes, portions and target/actual nutrition.
