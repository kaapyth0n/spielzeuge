import { VISITORS, isVisitor, type VisitorId } from './slime-visitors.ts'
export type SlimeBaby = { color: string; cuddles: number; parent: VisitorId }
export type SlimeState = { coins: number; clean: number; energy: number; joy: number; record: number; color: string; costume: string; decor: string; owned: string[]; sound: boolean; friendship: number; friendships: Partial<Record<VisitorId,number>>; lastVisitor: VisitorId | null; visitorQueue: VisitorId[]; babies: SlimeBaby[]; baby: SlimeBaby | null }
export const ITEMS = [
  { id: 'mint', name: 'Мятный', icon: '🟢', price: 0, kind: 'color', value: '#99dfc0' },
  { id: 'berry', name: 'Ягодный', icon: '🟣', price: 20, kind: 'color', value: '#c4a4ed' },
  { id: 'peach', name: 'Персиковый', icon: '🟠', price: 20, kind: 'color', value: '#ffbd98' },
  { id: 'sky', name: 'Небесный', icon: '🔵', price: 20, kind: 'color', value: '#9ccff4' },
  { id: 'none', name: 'Без костюма', icon: '♡', price: 0, kind: 'costume', value: '' },
  { id: 'bow', name: 'Бантик', icon: '🎀', price: 25, kind: 'costume', value: '🎀' },
  { id: 'crown', name: 'Корона', icon: '👑', price: 40, kind: 'costume', value: '👑' },
  { id: 'wizard', name: 'Волшебник', icon: '🧙', price: 50, kind: 'costume', value: '🧙' },
  { id: 'plain', name: 'Уютный дом', icon: '🏡', price: 0, kind: 'decor', value: '' },
  { id: 'flowers', name: 'Цветочный дом', icon: '🌼', price: 35, kind: 'decor', value: '🌼' },
  { id: 'stars', name: 'Звёздный дом', icon: '⭐', price: 50, kind: 'decor', value: '⭐' },
] as const
export const fresh = (): SlimeState => ({ coins: 15, clean: 65, energy: 75, joy: 65, record: 0, color: 'mint', costume: 'none', decor: 'plain', owned: ['mint', 'none', 'plain'], sound: true, friendship: 0, friendships: {}, lastVisitor: null, visitorQueue: [], babies: [], baby: null })
const bounded = (n: unknown, fallback: number, max = 100) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : fallback
export function restore(raw: string | null): SlimeState {
  const base = fresh()
  try {
    const p = JSON.parse(raw || '{}')
    if (!p || typeof p !== 'object') return base
    const owned = [...new Set([...base.owned, ...(Array.isArray(p.owned) ? p.owned.filter((id: unknown) => ITEMS.some(i => i.id === id)) : [])])] as string[]
    const friendships: SlimeState['friendships'] = {}
    for(const v of VISITORS) {
      if(p.friendships && typeof p.friendships === 'object' && v.id in p.friendships) friendships[v.id]=bounded(p.friendships[v.id],0,3)
    }
    if(!p.friendships && p.friendship) friendships.mira=bounded(p.friendship,0,3)
    const rawBabies = Array.isArray(p.babies) ? p.babies : p.baby ? [p.baby] : []
    const babies: SlimeBaby[] = rawBabies.filter((b: unknown) => b && typeof b === 'object' && ITEMS.some(i => i.kind === 'color' && i.id === (b as SlimeBaby).color)).map((b: SlimeBaby) => ({color:b.color,cuddles:bounded(b.cuddles,0,999999),parent:isVisitor(b.parent)?b.parent:'mira'}))
    return { babies, baby: babies[0] ?? null, friendships, lastVisitor: isVisitor(p.lastVisitor)?p.lastVisitor:null,
      visitorQueue: Array.isArray(p.visitorQueue)?[...new Set(p.visitorQueue.filter(isVisitor))] as VisitorId[]:[], sound: typeof p.sound === 'boolean' ? p.sound : true, friendship: bounded(p.friendship, 0, 3),

      coins: bounded(p.coins, base.coins, 999999), clean: bounded(p.clean, base.clean), energy: bounded(p.energy, base.energy), joy: bounded(p.joy, base.joy), record: bounded(p.record, 0, 400), owned,
      color: ITEMS.some(i => i.id === p.color && i.kind === 'color' && owned.includes(i.id)) ? p.color : base.color,
      costume: ITEMS.some(i => i.id === p.costume && i.kind === 'costume' && owned.includes(i.id)) ? p.costume : base.costume,
      decor: ITEMS.some(i => i.id === p.decor && i.kind === 'decor' && owned.includes(i.id)) ? p.decor : base.decor }
  } catch { return base }
}
export function care(s: SlimeState, stat: 'clean' | 'energy' | 'joy'): number {
  const gain = Math.min(25, 100 - s[stat]); s[stat] += gain
  const reward = gain > 0 ? Math.ceil(gain / 5) : 0; s.coins += reward; return reward
}
export function buy(s: SlimeState, id: string): boolean {
  const item = ITEMS.find(i => i.id === id)
  if (!item || (!s.owned.includes(id) && s.coins < item.price)) return false
  if (!s.owned.includes(id)) { s.coins -= item.price; s.owned.push(id) }
  s[item.kind] = id; return true
}
export const stretchLimit = (s: SlimeState) => Math.round(100 + (s.clean + s.energy + s.joy))

export type Meeting = { visitor: VisitorId; permission: boolean; friendEnergy: number; agreed: boolean; pieces: number }
export const newMeeting = (visitor: VisitorId = 'mira'): Meeting => ({ visitor, permission: false, friendEnergy: 100, agreed: false, pieces: 0 })
export function askOwner(s: SlimeState, m: Meeting): string {
  m.permission = s.clean >= 50 && s.energy >= 25
  return m.permission ? 'Мира: «Конечно! Облачко тоже хочет поиграть. Я буду рядом».' : s.clean < 50 ? 'Мира: «Сначала смойте грязь, а потом приходите играть. Мы подождём!»' : 'Мира: «Твой слайм устал. Пусть поспит, а потом поиграем!»'
}
export function playTogether(s: SlimeState, m: Meeting): boolean {
  if (!m.permission || s.energy < 15 || m.friendEnergy < 15) return false
  s.energy -= 8; m.friendEnergy -= 8; s.joy = Math.min(100, s.joy + 12)
  s.friendship = Math.min(3, friendshipWith(s,m) + 1)
  s.friendships[m.visitor] = s.friendship
  m.agreed = false; m.pieces = 0
  return true
}
export function wishes(s: SlimeState, m: Meeting): [boolean, boolean] {
  return [friendshipWith(s,m) >= 3 && s.clean >= 60 && s.energy >= 50 && s.joy >= 75,
    friendshipWith(s,m) >= 3 && m.friendEnergy >= 50]
}
export function askSlimes(s: SlimeState, m: Meeting): boolean {
  m.agreed = m.permission && wishes(s, m).every(Boolean)
  m.pieces = 0
  return m.agreed
}
export function givePiece(s: SlimeState, m: Meeting): boolean {
  if (!m.agreed || !m.permission || !wishes(s, m).every(Boolean)) { m.agreed = false; m.pieces = 0; return false }
  m.pieces += 1
  if (m.pieces === 2) {
    s.babies.push({ color: s.color, cuddles: 0, parent: m.visitor })
    s.baby = s.babies[0] // Compatibility with the first saved game version.
    s.energy -= 5; m.friendEnergy -= 5; m.agreed = false; m.pieces = 0
  }
  return true
}

export function friendshipWith(s: SlimeState, m: Meeting): number {
  return s.friendships[m.visitor] ?? (m.visitor === 'mira' && s.lastVisitor === null ? s.friendship : 0)
}
/** A shuffled bag visits everyone before cycling, without adjacent repeats. */
export function nextMeeting(s: SlimeState, random: () => number = Math.random): Meeting {
  if(!s.visitorQueue.length) {
    s.visitorQueue=VISITORS.map(v=>v.id)
    for(let i=s.visitorQueue.length-1;i>0;i--) {
      const j=Math.floor(random()*(i+1)); [s.visitorQueue[i],s.visitorQueue[j]]=[s.visitorQueue[j],s.visitorQueue[i]]
    }
  }
  if(s.visitorQueue[0]===s.lastVisitor && s.visitorQueue.length>1) [s.visitorQueue[0],s.visitorQueue[1]]=[s.visitorQueue[1],s.visitorQueue[0]]
  // A restored partial bag must also avoid repeating the last encounter.
  if(s.visitorQueue.length===1 && s.visitorQueue[0]===s.lastVisitor) {
    s.visitorQueue=VISITORS.map(v=>v.id).filter(id=>id!==s.lastVisitor)
  }
  const id=s.visitorQueue.shift()!
  s.lastVisitor=id; s.friendship=s.friendships[id] ?? 0
  return newMeeting(id)
}
