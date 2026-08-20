export type Phase =
  | 'boot'
  | 'closed'
  | 'knocking'
  | 'waiting'
  | 'opening'
  | 'open'
  | 'closing'

export type Zone = 'lamp' | 'visitor' | 'door' | 'elsewhere'

export type Action =
  | 'ignore'
  | 'knock'
  | 'open'
  | 'close'
  | 'greet'
  | 'cycle-lang-name'
  | 'cycle-lang-word'

/**
 * One tap, one action. Language names are spoken only for `cycle-lang-name`,
 * which is only returned for a lamp tap when no guest is in the doorway.
 *
 * | phase            | lamp              | visitor | door  | elsewhere |
 * | boot / closed    | cycle-lang-name   | ignore  | knock | ignore    |
 * | knocking/waiting | cycle-lang-name   | ignore  | open  | ignore    |
 * | opening          | cycle-lang-word*  | ignore  | ignore| ignore    |
 * | open             | cycle-lang-word   | greet   | close | ignore    |
 * | closing          | ignore            | ignore  | ignore| ignore    |
 *
 * *cycle-lang-word if a visitor is already assigned, else cycle-lang-name.
 * "door" is the whole door frame (leaf, jambs, opening). Hall/floor/wallpaper are elsewhere.
 */
export function decide(phase: Phase, zone: Zone, hasVisitor: boolean): Action {
  if (phase === 'closing') return 'ignore'

  if (zone === 'lamp') {
    if (hasVisitor && (phase === 'open' || phase === 'opening')) {
      return 'cycle-lang-word'
    }
    return 'cycle-lang-name'
  }

  if (zone === 'elsewhere') return 'ignore'
  if (phase === 'opening') return 'ignore'

  if (phase === 'open') {
    if (zone === 'visitor') return 'greet'
    return 'close'
  }

  if (phase === 'knocking' || phase === 'waiting') {
    if (zone === 'door') return 'open'
    return 'ignore'
  }

  // boot / closed
  if (zone === 'door') return 'knock'
  return 'ignore'
}

export function zoneFromTarget(target: EventTarget | null): Zone {
  if (!(target instanceof Element)) return 'elsewhere'
  if (target.closest('[data-zone="lamp"]')) return 'lamp'
  if (target.closest('[data-zone="visitor"]')) return 'visitor'
  if (target.closest('[data-zone="door"]')) return 'door'
  return 'elsewhere'
}
