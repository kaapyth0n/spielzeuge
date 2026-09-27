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
