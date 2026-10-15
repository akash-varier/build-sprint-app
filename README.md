# Tomorrow’s menu — milestone 1

Development preview: https://hidden-oriole-913.convex.site

## Check on your phone

1. Add `OPENAI_API_KEY` privately in the Convex dashboard, Settings → Environment Variables, for development deployment `hidden-oriole-913`. Never put it in chat or a source file.
2. Open the preview link in Safari or Chrome on your phone. No sign-in is required.
3. Add fridge ingredients from the quick buttons or search. Choose each item’s unit and enter its uncooked quantity. Eggs default to pieces; rice to cups. Switching units preserves the amount through Convex. Include cooking oil and spices if you have them. Mark any ingredients that must be used.
4. Expand Family targets. Enter a name, supplied daily protein/carbs/fat/fibre targets, dietary choice, supported allergies, and preferences for each person.
5. Tap Generate tomorrow’s menu. Expect breakfast, lunch and dinner, approximate household portions with smaller cooked gram weights and estimated nutrition for each person, and a daily target check. A match means every macro is within ±5 g of that person's target. Target gaps mean the menu cannot meet those targets with the allowed portions; update inputs and generate again.
6. Tap View required ingredients. Quantities should cover every family member’s portions across all meals. This is an ingredient breakdown, not a shopping list.

Use made-up data for initial testing. Example daily targets (test values, not recommendations): Test A: protein 100 g, carbs 200 g, fat 60 g, fibre 30 g; Test B: 80 / 160 / 48 / 24 g.

## How the calculation works

The AI returns two or three item batches per meal (main, stocked staple, optional shared side), raw ingredient weights, cooked total weight, and total batch macros. It never returns portions. Convex finds portions that minimise each person's largest daily macro error. Each cooked item portion obeys firm caps: 4 eggs, 316 g for rice-containing items, 450 g for any item. Bread totals at most 4 slices across a meal. Meals aim for 25–40% of each daily macro; missed ranges and daily gaps remain visible. Macros are recomputed from the portion weights actually displayed. The recipe quantities are then scaled to the sum of everyone's portions, so cooking totals and individual totals agree.

A shared dish is assumed to be evenly mixed, with the same nutrient density for every person's serving. The AI's macro numbers and cooked yields are estimates; arithmetic precision does not establish real food accuracy. All three meals account for the full supplied daily targets, without snacks.

Every recipe must use at least 80% available ingredient types, counted by distinct ingredient IDs, excluding water. A listed item with too little stock can still require more grams. Stock is not consumed when a suggestion is generated. Recipes follow the strictest dietary choice and avoid all selected allergies across the household.

Milestone 1 supports 38 listed ingredients, nine named allergy categories, and 1–6 people. Unknown ingredients or allergies are not guessed. Preferences are guidance for the AI; allergy and dietary exclusions are enforced in Convex. Family targets move from their temporary fridge section to onboarding later.

## Local development and checks

- `npm run dev`: open the local app. `.env.local` supplies the connected Convex development URL.
- `npx convex dev --once`: check and push backend functions to development.
- `npm test`: portion arithmetic, unavailable target combinations, ingredient coverage, allergies, dietary choices and input checks.
- `npm run build`: check TypeScript and build the website.
- `npx @convex-dev/static-hosting upload --build`: publish a development preview.
- `npm run deploy`: production deployment, after milestone confirmation. Set the OpenAI key privately on production first.

The model is `gpt-6-luna` through the Responses API with low reasoning and a 4000-output-token cap. Provider retries are disabled. Convex enforces 100 requests in any rolling hour globally, using a transactional indexed ledger plus the rate limiter component, and three requests per minute per household. Failed attempts after reservation count towards the limit. The user controls the provider's monthly spend setting.

No approval/rejection, shopping-list actions, share links, videos, dish photos, notifications, onboarding screen, or sign-in are implemented.

Household units use explicit reference sizes: cup 240 ml, katori 150 ml, egg 50 g per piece and spinach 100 g per bunch. Other food-specific reference weights live only in `convex/lib/ingredientUnits.ts`; they are estimates, not measured densities. Cooked labels round to quarter measures (roti 40 g, paratha 80 g, idli 40 g, cooked rice cup 158 g, oats cup 240 g, other mixed dishes katori 150 g). Gram portions and all macro calculations remain unchanged. Unsupported combinations such as rice in pieces are omitted. Existing saved gram quantities are converted into natural units without rounding the underlying amount.

A poorly fitting menu can trigger one replacement AI request for different dishes. Both requests count against the existing call limits; the better safe capped menu is retained. Raw Ingredients now lead with the same natural units as the fridge, with whole pieces rounded up and exact calculated grams underneath.

Meal ranges apply to the sum of all item nutrition in a meal. Convex solves all item portions together; the AI picks combinations according to saved cuisine preferences. Plain milk/egg-free bread (30 g reference slice) and egg-free pasta are supported, retaining wheat/gluten checks. The optional side is shared; per-person sides remain parked.
