import { words, FOOD, type Food } from './devochka-copy.ts'
import { dinerName, type Diner } from './devochka-guests.ts'
import { MEAL_SCENES } from './devochka-scenes.ts'
import type { Notebook } from './devochka-state.ts'
import type { Lang } from './languages.ts'

export type Seat = Diner | 'bunny'
export type Bowl = 'cat' | 'dog' | 'bunny'
export type Portion = Food | Bowl
export const isBowl = (id: unknown): id is Bowl => id === 'cat' || id === 'dog' || id === 'bunny'
export const hasMeal = (s: Notebook) => s.result === null && (s.seated !== null || s.table.length !== 0)
export const orderIndex = (s: Notebook) => s.revisit ?? s.day % MEAL_SCENES.length
export function sceneIndex(s: Notebook): number {
  if (typeof s.result === 'number') return s.result
  return hasMeal(s) || s.result === 'free' ? orderIndex(s) : 0
}
export const sceneOf = (s: Notebook) => MEAL_SCENES[sceneIndex(s)]
export function seats(s: Notebook): Seat[] {
  const diner = s.seated ?? s.diner
  const scene = sceneOf(s)
  const human = diner === 'friend' && scene.id !== 'picnic' ? 'friend' : 'girl'
  const party = new Set<Seat>([human])
  if (scene.guest) party.add(scene.guest)
  if (scene.id === 'courtyard') {
    party.add('girl')
    party.add('friend')
  }
  party.add(diner)
  const companion = s.seated !== null ? s.seatedPet : s.pet
  if (companion !== 'none') party.add(companion)
  return [...party]
}
const bowls = {
  cat: words('Миска с рыбкой', 'Fisch für den Kater', 'Fish for the cat'),
  dog: words('Миска с кормом', 'Futter für den Welpen', 'Puppy kibble'),
  bunny: words('Морковка для зайчика', 'Möhren für den Hasen', 'Carrots for Bunny'),
}
const appreciation = {
  cat: words(
    'Мур-р! Рыжик слизнул последнюю крошку.',
    'Schnurr! Der Kater schleckt den letzten Krümel auf.',
    'Purr! Ginger licks up the last crumb.'
  ),
  dog: words(
    'Гав! Щенок виляет хвостиком.',
    'Wuff! Der Welpe wedelt mit dem Schwanz.',
    'Woof! The puppy wags its tail.'
  ),
  bunny: words(
    'Хрум-хрум! Зайчик довольно шевелит ушами.',
    'Knack, knack! Der Hase wackelt zufrieden mit den Ohren.',
    'Crunch, crunch! Bunny wiggles his ears.'
  ),
}
export const portionName = (id: Portion, l: Lang) => (isBowl(id) ? bowls[id] : FOOD[id].name)[l]
export const yummy = (id: Portion, l: Lang) => (isBowl(id) ? appreciation[id] : FOOD[id].happy)[l]
export const seatName = (id: Seat, l: Lang) =>
  id === 'bunny' ? words('Зайчик', 'Hase', 'Bunny')[l] : dinerName(id, l)
export function pendingBowls(s: Notebook): Bowl[] {
  return hasMeal(s)
    ? seats(s)
        .filter(isBowl)
        .filter((seat) => !s.tasted.includes(seat))
    : []
}
export function recipients(s: Notebook, portion: Portion): Seat[] {
  if (isBowl(portion)) return pendingBowls(s).filter((id) => id === portion)
  const people = seats(s).filter((id) => !isBowl(id))
  const waiting = people.filter((seat) => !s.tasted.includes(seat))
  return s.table.length === 1 && waiting.length
    ? waiting
    : [...waiting, ...people.filter((id) => !waiting.includes(id))]
}
export const tableWords = {
  together: words('За обедом', 'Tischrunde', 'At the table'),
  bowl: words(
    'Подвинь миску к её хозяину или нажми на него.',
    'Schiebe den Napf zum passenden Tier oder tippe es an.',
    'Slide the bowl to the animal it belongs to, or tap the animal.'
  ),
  stillHungry: words(
    'Теперь угости гостя из его миски.',
    'Jetzt bekommt dein Gast seinen Napf.',
    'Now give your guest their bowl.'
  ),
  share: words(
    'Осталась ещё порция. Угости того, кто пока ждёт!',
    'Eine Portion ist noch da. Gib sie der Person, die noch wartet!',
    'There’s a portion left to share. Give it to the diner who’s still waiting!'
  ),
  for: words('Вот кто ждёт это угощение', 'Auf diese Portion wartet', 'This serving is for'),
  returnMeal: words('Вернуться к обеду', 'Zurück zum Essen', 'Back to the meal'),
  onWall: words(
    'Твоя наклейка висит в домике.',
    'Dein Sticker hängt jetzt zu Hause.',
    'Your sticker is up on the kitchen wall.'
  ),
}
