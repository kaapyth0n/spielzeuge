"""Re-download reviewed assets from the frozen manifest, never search/select automatically.
Requires requests and Pillow. Stops on rate limit; no retry loop.
Run from repository root. Keeps each photograph's original aspect ratio.
"""
import hashlib,json,time,io
from pathlib import Path
import requests
from PIL import Image,ImageOps
m=json.loads(Path('public/puzzles/manifest.json').read_text())
s=requests.Session();s.headers['User-Agent']='Spielzeuge educational puzzles/1.0 (kapitonov.su)'
for a in m:
 path=Path('public/puzzles/images')/(a['id']+'.webp')
 if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==a['sha256']:continue
 response=s.get(a['download'],timeout=60)
 if response.status_code==429:raise SystemExit('Rate limited; stop. Retry-After: '+str(response.headers.get('Retry-After')))
 response.raise_for_status()
 im=Image.open(io.BytesIO(response.content)).convert('RGB')
 if a.get('crop'):im=im.crop(tuple(a['crop']))
 im=ImageOps.contain(im,(960,720))
 canvas=Image.new('RGB',(960,720),(232,232,218));canvas.paste(im,((960-im.width)//2,(720-im.height)//2));canvas.save(path,quality=87)
 print(a['id'],hashlib.sha256(path.read_bytes()).hexdigest())
 time.sleep(4)
