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

At every table the gestures also work in steps. Select the food and its diner. The scissors button cuts a bag, and the water button can hold the glass for the child. The child can float a paper boat, send a leaf after the kite and tap three stars to trace a constellation. The kitchen music box plays an original tune.

## The eight lunches

The shopping list determines where everyone goes after payment. Extras are welcome. A free-choice lunch leaves the current sticker order available. After the eighth sticker the menus cycle again.

| Order | Where the food goes |
| --- | --- |
| Lunch by the window | The kitchen table in the morning sun. |
| Picnic with the cat | Matryona’s original girl and the ginger cat sit on his striped blanket in a meadow. The cat has a fish bowl. |
| In the daisy garden | A cloth among the daisies. |
| Chasing the wind | A hill under a flying kite. |
| Moonlight supper | A clearing lit by the moon and a lantern. |
| Company at the door | Bunny comes to the furnished kitchen and gets his own carrots. |
| Paper boat regatta | A grassy bank beside a stream with paper boats. |
| Courtyard party | The girl and her friend share the outdoor party table beneath coloured bunting. |

Children choose who to serve by tapping or dragging. The last human portion can be shared when a second person is still waiting. The friend can bring a second pet along. Each animal has a dish of its own. A meal is complete when the food is gone and everyone has eaten. Leaving and returning restores even a single remaining pet bowl. Selecting a different dinner guest during lunch applies to the next purchase.

The first, second and third meal stickers unlock the ginger cat, the friend and the puppy respectively. Pick a diner in the guest book. The friend has three eye styles and three mouths. The gear opens the house studio. Choose a curtain, table, teapot or tablecloth colour independently. Each has its original drawing and three additional colours. A kitchen sticker can be changed from the album. Older notebooks keep characters they already customised or invited.

## Earning coins

| Game | How to earn coins |
| --- | --- |
| Apple orchard · 5 | Read the picture order, track the red or golden apple and move the basket into its landing lane. Wind changes its path and the pace grows across six catches. Repeated misses slow the fruit and highlight the lane. Tap, drag or use the arrow keys. |
| Musical jars · 7 | Listen to three tunes of two, three and four notes and play them back. Every jar has its own fruit, colour and pitch. The melody can be replayed. |
| Bunny’s pancake kitchen · 6 | Pour batter, watch the pancake change colour, flip when golden, then add the topping each of three guests ordered. A pancake can be remade. |
| Paper boat regatta · 8 | Rotate the stream tiles, connect the dock to the flag and launch a paper boat. Sail three courses. If the stream breaks, the boat shows the piece to turn. |

The shopping basket waits in the shop and the current meal remains on the table during the games.

## Drawing and sound

The original character in [girl.webp](../public/devochka/girl.webp) uses the pencil and blue marks from the supplied photograph. Its silhouette was traced around the drawing, and its paper colour was balanced for display. The girl who sits on the picnic blanket uses these same original pencil marks.

The built-in ImageGen tool produced these scene and sticker assets. The production prompts specified the following compositions.

| Asset | Prompt and art direction |
| --- | --- |
| [Shop](../public/devochka/shop.webp) | Front-on market stall in wax crayon, scuffed coloured pencil and block-printed gouache. Butter-yellow and persimmon awning, teal posts, a quiet window on the left and two empty honey-coloured shelves on the right. Leave space for the original girl and interactive food. |
| [Kitchen](../public/devochka/home.webp) | Frontal dollhouse kitchen, broad empty centre, blue window with red polka-dot curtains, teapot and mugs on the far right, wooden table with a gingham edge. |
| [Dumplings](../public/devochka/dumpling.webp), [rolls](../public/devochka/roll.webp), [chips](../public/devochka/chips.webp), [water](../public/devochka/water.webp) | A transparent four-square sheet of crayon stickers. Three pleated dumplings in a striped tub, maki on a mint saucer, a cobalt bag with a yellow chip badge, and a clear tumbler with a blue-striped straw. Each food was cut into its own WebP. |
| [Till](../public/devochka/till.webp) | A vintage mint toy register with blue and coral keys, a paper receipt, a rabbit face on the left of a blank butter-yellow display and a blue ball on the crank. The game draws the actual price. |
| [Orchard](../public/devochka/orchard.webp) | An apple canopy framing open cornflower sky, low green hills, a distant fence and daisies. Leave the middle open for falling fruit and the foreground open for the moving basket. |

The six outdoor backgrounds also came from ImageGen. Their compositions leave the diners and foreground food to the game. The meadow has a broad striped blanket beneath a birch, the garden is filled with daisies, the hill has a kite caught by the wind, the clearing has a lantern, the stream has folded boats, and the courtyard has a long table and bunting. The ginger cat with a turquoise kerchief, the floppy-eared puppy with a green scarf, and the rabbit in a bow tie are separate transparent crayon illustrations. Their bowls and the seated legs were drawn in SVG. Four transparent paint atlases follow the pencil outlines of the kitchen furnishings.

Speech uses the selected device language and prefers an available childlike voice. The Web Audio instruments play the jar notes, coin clinks, scissors, crunches, water, pet sounds and a short music-box waltz. The visible sound control stops speech and music together.

## Checks

`npm test` exercises exact payment, duplicate quantities, serving order, the eight stickers and save recovery. `npm run build` type-checks and bundles the game. With a local Vite server running, `npm run test:devochka` plays all three catalog-to-lunch flows, all eight stories and four coin games, real pointer and touch gestures, room paint masks, guest unlocks, audio and storage fallbacks. The script accepts `BASE_URL` and `CHROMIUM_PATH`. Browser screenshots are written to `tmp/devochka/spec/`.

Progress uses `spielzeuge.devochka.v1`. The sound setting uses `spielzeuge.devochka.muted`. Language uses the catalog preference `spielzeuge.lang`. The notebook saves coins, purchases, partially served meals, stickers and room choices on the device.
