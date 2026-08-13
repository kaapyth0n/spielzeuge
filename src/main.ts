import '@fontsource/pt-serif/cyrillic-400.css'
import '@fontsource/pt-serif/latin-400.css'
import '@fontsource/pt-serif/latin-ext-400.css'
import '@fontsource/pt-serif/latin-700.css'
import './style.css'
import { Game } from './game.ts'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Missing #app')

const game = new Game(root)
game.start()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js')
  })
}
