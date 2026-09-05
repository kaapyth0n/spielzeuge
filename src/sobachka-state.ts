export const PUPPY_KEY = 'spielzeuge.sobachka.v1'
export const CARE = ['feed', 'walk', 'sleep', 'ball'] as const
export type Care = (typeof CARE)[number]
export interface PuppyState {
  hearts: number
  wall: number
  care: Record<Care, number>
  sound: boolean
}
export const freshPuppy = (): PuppyState => ({
  hearts: 0,
  wall: 0,
  care: { feed: 0, walk: 0, sleep: 0, ball: 0 },
  sound: true,
})
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(999, Math.max(0, Math.floor(value)))
    : 0
export function restorePuppy(raw: string | null): PuppyState {
  const state = freshPuppy()
  try {
    const data = JSON.parse(raw ?? 'null')
    if (!data || typeof data !== 'object') return state
    state.hearts = count(data.hearts)
    state.wall = count(data.wall) % 3
    for (const key of CARE) state.care[key] = count(data.care?.[key])
    state.sound = data.sound !== false
  } catch {
    /* Corrupt or unavailable storage starts a fresh, happy puppy. */
  }
  return state
}
export function careFor(state: PuppyState, action: Care): PuppyState {
  return {
    ...state,
    hearts: Math.min(999, state.hearts + 1),
    care: { ...state.care, [action]: Math.min(999, state.care[action] + 1) },
  }
}
export function unlockedGames(hearts: number): number {
  return hearts >= 6 ? 3 : hearts >= 3 ? 2 : 1
}
export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
