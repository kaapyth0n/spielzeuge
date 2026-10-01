export const ACTIVITIES = ['swing', 'roundabout', 'slide', 'climb', 'cars', 'bars', 'sand', 'football'] as const
export type Activity = typeof ACTIVITIES[number]
export const COLORS = ['#dd6090','#498fce','#e99834','#8e70cf','#3ca58c','#e87758','#ad7fc1']
export const countWithinBounds = (n: number) => Math.max(1, Math.min(20, Math.round(Number.isFinite(n) ? n : 8)))
export function nearestActivity(x: number, y: number, spots: {x:number;y:number}[]): number {
  return spots.reduce((best, s, i) => Math.hypot(x-s.x,y-s.y) < Math.hypot(x-spots[best].x,y-spots[best].y) ? i : best, 0)
}
export function fingerprintPaths(): string[] {
  return Array.from({length: 12}, (_,i) => {
    const rx = 3+i*1.8, ry = 5+i*2.45
    return `M ${-rx*.65} ${ry*.85} C ${-rx*1.5} ${ry*.15}, ${-rx} ${-ry}, 0 ${-ry} C ${rx} ${-ry}, ${rx*1.5} ${ry*.5}, ${rx*.2} ${ry} M ${rx*.2} ${ry} Q ${-rx*.25} ${ry*.6} 0 ${ry*.1}`
  })
}
