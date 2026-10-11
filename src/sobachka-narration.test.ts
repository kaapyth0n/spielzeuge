import { describe, expect, it } from 'vitest'
import { speakable } from './sobachka-narration.ts'

describe('speakable narration text', () => {
  it('drops typographic quotes that voices read out as symbol names', () => {
    expect(speakable('Скажи «А» — и мороженка полетит!')).toBe('Скажи А — и мороженка полетит!')
    expect(speakable('Mira: „Natürlich! Wölkchen möchte auch spielen.“')).toBe('Mira: Natürlich! Wölkchen möchte auch spielen.')
    expect(speakable('Cloud: “Hello, our little Droplet!” ♥')).toBe('Cloud: Hello, our little Droplet!')
  })

  it('keeps apostrophes, dashes and plain punctuation', () => {
    expect(speakable('Don’t touch the walls – fly!')).toBe('Don’t touch the walls – fly!')
    expect(speakable('  Раунд 2.\n Вправо ✓ ')).toBe('Раунд 2. Вправо')
  })
})

describe('Мороженка pronunciation', () => {
  it('splits the suffix so the voice stresses морОжен-, and leaves other words alone', async () => {
    const { pronounce } = await import('./morozhenka-copy.ts')
    expect(pronounce('Мороженка. Скажи А — и мороженка полетит!', 'ru')).toBe('Морожен-ка. Скажи А — и морожен-ка полетит!')
    expect(pronounce('Научи мороженку своему голосу', 'ru')).toBe('Научи морожен ку своему голосу')
    expect(pronounce('две мороженки', 'ru')).toBe('две морожен-ки')
    expect(pronounce('мороженое и мороженщик', 'ru')).toBe('мороженое и мороженщик')
    expect(pronounce('Мороженка', 'de')).toBe('Мороженка')
  })
})

describe('PuppyNarration before the first tap', () => {
  it('reports speech the browser refused, and clears it with the next tap', async () => {
    const spoken: string[] = []
    let refuse = true
    class Utterance {
      text: string
      lang = ''
      rate = 1
      volume = 1
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    const synth = {
      paused: false,
      speak(u: Utterance) {
        if (refuse && u.text.trim()) setTimeout(() => u.onerror?.({ error: 'not-allowed' }), 0)
        else if (u.text.trim()) spoken.push(u.text)
      },
      cancel() {},
      resume() {},
      getVoices: () => [],
      addEventListener() {},
    }
    const g = globalThis as Record<string, unknown>
    const saved = { window: g.window, document: g.document, SpeechSynthesisUtterance: g.SpeechSynthesisUtterance }
    g.window = { speechSynthesis: synth, setTimeout, clearTimeout }
    g.document = { hidden: false }
    g.SpeechSynthesisUtterance = Utterance
    try {
      const { PuppyNarration } = await import('./sobachka-narration.ts')
      const narration = new PuppyNarration(() => ({ lang: 'ru', enabled: true }))
      expect(narration.refused).toBe(false)
      narration.announce(['Давай сделаем лошадку!'])
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(narration.refused).toBe(true)
      expect(spoken).toEqual([])
      refuse = false
      narration.begin('Рыжая грива')
      expect(narration.refused).toBe(false)
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(spoken).toEqual(['Рыжая грива'])
    } finally {
      Object.assign(g, saved)
    }
  })
})
