# Девочка

Open `/devochka/` or choose **Девочка**, **Das Mädchen** or **The Little Girl** at the top of the catalog.

Matryona drew a girl with two buns, a blue sweater, four foods, a little portrait of the diner and a shop with a rabbit on its till. In her conversation with her father she named the game and described the shopping, exact payment and four serving gestures. They also discussed earning coins through games, making another character, decorating the house and keeping a pet.

## At the counter

The first visit starts at the shop with twelve coins. Tap the girl or the speech bubble to hear her order. The illustrated list marks each requested food as it goes into the basket. Tap a product on the shelf to add a portion, or tap it in the basket to put one back. A basket holds six portions. The player can shop freely and can add extras to a lunch order.

| Food | Price | How to serve it |
| --- | ---: | --- |
| Dumplings | 3 | Lift a dumpling with the tongs and carry it to the mouth. |
| Sushi rolls | 4 | Pick up a roll with a finger and bring it to the mouth. |
| Blue chips | 2 | Swipe across the bag to cut it, then carry a chip to the mouth. Each new bag needs its own cut. |
| Water | 1 | Bring the glass to the mouth and hold it there while the drop fills. |

The till shows the price beside the rabbit. Place coins worth one, two or five onto the saucer. The last coin can be taken back. A coin that would take the total over the price stays in the purse. When the sum is exact, pull the blue lever or press the lever button. The payment and transfer to the table are saved together. A new checkout waits until the previous meal is finished.

At home the same gestures also work in steps. Choose a food, then tap the girl. The scissors button cuts a bag, and a button can hold the glass for the child. The window visitor tells a different little story for each lunch. The blue music box plays an original tune.

## The eight lunches

Lunch by the window, a picnic with the cat, the daisy garden, the kite, moonlight supper, a visit from Bunny, a paper boat regatta and the courtyard party have illustrated shopping lists. Serving a list earns its sticker. Later menus ask for multiple portions. A free-choice meal leaves the current order available. After the eighth sticker the menus cycle again.

Tap any sticker in the album to find out about it. A collected sticker can be hung in the kitchen. The round portrait in the kitchen opens the decorating controls. Choose Matryona’s original girl or make a friend with three eye styles and three mouths, choose a room colour and invite a cat or a dog.

## Earning coins

The apple orchard pays five coins for catching three apples. Tap a lane, slide the basket or use the arrow keys. Leaves drift down between apples. A missed apple gives the player another chance.

Musical jars pays seven coins for repeating three tunes of two, three and four notes. Each jar has its own fruit, colour and pitch and lights up as its note plays. The sequence can be replayed. An incorrect note repeats the current tune. The basket waits in the shop during both games.

## Drawing and sound

The original character in [girl.webp](../public/devochka/girl.webp) uses the pencil and blue marks from the supplied photograph. Its silhouette was traced around the drawing, and its paper colour was balanced for display. The circle portrait and the larger figure use this same artwork.

The built-in ImageGen tool produced these scene and sticker assets. The production prompts specified the following compositions.

| Asset | Prompt and art direction |
| --- | --- |
| [Shop](../public/devochka/shop.webp) | Front-on market stall in wax crayon, scuffed coloured pencil and block-printed gouache. Butter-yellow and persimmon awning, teal posts, a quiet window on the left and two empty honey-coloured shelves on the right. Leave space for the original girl and interactive food. |
| [Kitchen](../public/devochka/home.webp) | Frontal dollhouse kitchen, broad empty centre, blue window with red polka-dot curtains, teapot and mugs on the far right, wooden table with a gingham edge. |
| [Dumplings](../public/devochka/dumpling.webp), [rolls](../public/devochka/roll.webp), [chips](../public/devochka/chips.webp), [water](../public/devochka/water.webp) | A transparent four-square sheet of crayon stickers. Three pleated dumplings in a striped tub, maki on a mint saucer, a cobalt bag with a yellow chip badge, and a clear tumbler with a blue-striped straw. Each food was cut into its own WebP. |
| [Till](../public/devochka/till.webp) | A vintage mint toy register with blue and coral keys, a paper receipt, a rabbit face on the left of a blank butter-yellow display and a blue ball on the crank. The game draws the actual price. |
| [Orchard](../public/devochka/orchard.webp) | An apple canopy framing open cornflower sky, low green hills, a distant fence and daisies. Leave the middle open for falling fruit and the foreground open for the moving basket. |

Speech uses the selected device language and prefers an available childlike voice. The Web Audio instruments play the jar notes, coin clinks, scissors, crunches, water, pet sounds and a short music-box waltz. The visible sound control stops speech and music together.

## Checks

`npm test` exercises exact payment, duplicate quantities, serving order, the eight stickers and save recovery. `npm run build` type-checks and bundles the game. With a local Vite server running, `npm run test:devochka` plays all three catalog-to-lunch flows, plus coin games, gestures, customization, audio and storage fallbacks. The script accepts `BASE_URL` and `CHROMIUM_PATH`. Browser screenshots are written to `tmp/devochka/spec/`.

Progress uses `spielzeuge.devochka.v1`. The sound setting uses `spielzeuge.devochka.muted`. Language uses the catalog preference `spielzeuge.lang`. The notebook saves coins, purchases, partially served meals, stickers and room choices on the device.
