export type SlimeSound = 'tap' | 'pet' | 'wash' | 'sleep' | 'wake' | 'stretch' | 'drop' | 'ball' | 'coin' | 'baby'

/** Quiet, locally synthesized effects; no downloads or network are needed. */
export class SlimeAudio {
 private ctx: AudioContext | null = null
 private sources = new Set<AudioScheduledSourceNode>()
 private enabled: () => boolean
 constructor(enabled: () => boolean) { this.enabled = enabled }
 unlock(): void {
  if(!this.enabled()) return
  try { this.ctx ??= new AudioContext(); if(this.ctx.state==='suspended') void this.ctx.resume().catch(()=>{}) } catch { /* Sound is optional on unsupported browsers. */ }
 }
 silence(): void {
  this.sources.forEach(source=>{try{source.stop()}catch{/* already ended */}})
  this.sources.clear()
 }
 play(kind: SlimeSound): void {
  if(!this.enabled() || document.hidden) return
  this.unlock()
  const ctx=this.ctx
  if(!ctx) return
  this.silence()
  const notes: Record<SlimeSound, number[]> = {
   tap:[430], pet:[370,490], wash:[700,950,620,1100,800], sleep:[392,330,262], wake:[330,440,554],
   stretch:[190,290,420], drop:[135,80], ball:[220,350,240], coin:[784,1047], baby:[523,659,784,1047],
  }
  notes[kind].forEach((frequency,index)=>{
   const source=ctx.createOscillator(), gain=ctx.createGain()
   const start=ctx.currentTime+index*(kind==='sleep'?.2:.085), duration=kind==='sleep'?.35:.15
   source.type='sine'; source.frequency.setValueAtTime(frequency,start)
   source.frequency.exponentialRampToValueAtTime(kind==='stretch'?frequency*1.6:frequency*.8,start+duration)
   gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(.045,start+.015); gain.gain.exponentialRampToValueAtTime(.001,start+duration)
   source.connect(gain).connect(ctx.destination); this.sources.add(source)
   source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect()}
   source.start(start);source.stop(start+duration+.02)
  })
  if(kind==='wash'||kind==='drop') {
   const duration=kind==='wash'?.65:.15, buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate)
   const data=buffer.getChannelData(0)
   for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length)
   const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain()
   source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='wash'?1800:350;gain.gain.value=.035
   source.connect(filter).connect(gain).connect(ctx.destination);this.sources.add(source)
   source.onended=()=>{this.sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect()}
   source.start()
  }
 }
}
