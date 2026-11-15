import type { Game, Scene, SpeciesId } from './tamagochi-kit.ts'
import type { CopyKey } from './tamagochi-copy.ts'
import type { Save } from './tamagochi-state.ts'

/** What the main scenes get on top of `Game`: progress, words and scene changes. */
export interface Host extends Game {
  save: Save
  persist(): void
  go(scene: Scene): void
  /** A line of the main game in the current language, with `{name}` / `{n}` filled in. */
  t(key: CopyKey, vars?: { name?: string; n?: number }): string
  petName(species: SpeciesId): string
}
