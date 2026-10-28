"""Render attribution from the reviewed source manifest."""
import json
from pathlib import Path
m=json.loads(Path('public/puzzles/manifest.json').read_text())
lines=['# Photograph credits', '', 'Local Wikimedia Commons photographs. Family roles describe sex/age, not actual kinship. Each photograph retains its stated license.', '']
for a in m:
 lines += ['## '+a['id'], '', '['+a['title']+']('+a['source']+')', '', a['author']+' — ['+a['license']+']('+a['licenseUrl']+')', '', a['description'], '', 'Changes: '+a['changes'], '']
lines += ['## Sounds', '', 'Existing genuine recordings reused unchanged: cat, dog, budgerigar, adult cattle, adult goats, hen, rooster, adult pigs, adult sheep. Species examples, not pictured individuals. [Full sound credits](../sounds/CREDITS.md). Hamster, rabbit, babies and wildlife use spoken names only, explicitly disclosed. Device voices may be unavailable; text remains.']
Path('public/puzzles/CREDITS.md').write_text(chr(10).join(lines)+chr(10))
