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
