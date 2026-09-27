// Песенки: turn one Suno recording into game songs.
//
//   node scripts/pesenki-songs.mjs lyrics <song>            print the Suno lyrics for a song
//   node scripts/pesenki-songs.mjs build <song> <raw.mp3> <aligned.json>
//
// A recording holds all three languages one after another (same melody), separated by
// instrumental breaks. `build` aligns the words Suno reports (aligned_lyrics) with our
// lyrics letter by letter, cuts one file per language, normalises loudness, finds the
// beat and writes public/pesenki/<song>.<lang>.mp3 and src/pesenki-timings/<song>.<lang>.json.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LYRICS = JSON.parse(readFileSync(resolve(ROOT, 'src/pesenki-lyrics.json'), 'utf8'))

const [command, songId, rawPath, alignedPath] = process.argv.slice(2)
const song = LYRICS.songs.find((s) => s.id === songId)
if (!song) {
  console.error(`Unknown song "${songId}". Known: ${LYRICS.songs.map((s) => s.id).join(', ')}`)
  process.exit(1)
}

/** Lines of the whole recording, in sung order, with their language and role. */
function scriptLines(s) {
  const lines = []
  s.order.forEach((lang, li) => {
    const text = s.langs[lang]
    const verse = (v) => v.forEach((l) => lines.push({ lang, kind: 'pick', text: l.text, pic: l.pic, word: l.word }))
    const chorus = (n) => text.chorus.forEach((t) => lines.push({ lang, kind: 'sing', text: t, chorus: n }))
    verse(text.verse1)
    chorus(0)
    verse(text.verse2)
    chorus(1)
    if (li === s.order.length - 1 && s.outro) lines.push({ lang, kind: 'sing', text: s.outro, outro: true })
  })
  return lines
}

function sunoLyrics(s) {
  const parts = ['[Intro]', '']
  let verse = 1
  s.order.forEach((lang, li) => {
    const t = s.langs[lang]
    const block = (tag, rows) => parts.push(tag, ...rows, '')
    block(`[Verse ${verse++}]`, t.verse1.map((l) => l.text))
    block('[Chorus]', t.chorus)
    block(`[Verse ${verse++}]`, t.verse2.map((l) => l.text))
    block('[Chorus]', t.chorus)
    if (li < s.order.length - 1) parts.push('[Instrumental Break]', '')
  })
  if (s.outro) parts.push('[Outro]', s.outro, '')
  parts.push('[End]')
  return parts.join('\n')
}

if (command === 'lyrics') {
  console.log(sunoLyrics(song))
  process.exit(0)
}
if (command !== 'build' || !rawPath || !alignedPath) {
  console.error('usage: build <song> <raw.mp3> <aligned.json>')
  process.exit(1)
}

/* ───────────── letter-level alignment ───────────── */

const LETTER = /[\p{L}\p{N}]/u
const fold = (c) => c.toLowerCase().replace('ё', 'е').replace('ß', 's')

/** Display words of a line: punctuation-only tokens stick to the word before. */
function displayWords(text) {
  const out = []
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (!LETTER.test(token) && out.length) out[out.length - 1] += ` ${token}`
    else out.push(token)
  }
  return out
}

// Suno's aligned_lyrics: {aligned_words: [{word, start_s, end_s}]} or a compact [[word, start, end]] list.
const aligned = JSON.parse(readFileSync(alignedPath, 'utf8'))
const sunoWords = (Array.isArray(aligned) ? aligned : aligned.aligned_words)
  .map((w) => (Array.isArray(w) ? { word: w[0], start_s: w[1], end_s: w[2] } : w))
  .filter((w) => typeof w.word === 'string')
// Suno letters with interpolated times.
// A word glued to the next section tag ("кружись! [") swallows the whole instrumental
// break that follows it; no sung word lasts longer than this.
const LONGEST_WORD = 2.4
const suno = []
// Section tags ([Chorus], [Instrumental Break]) are never sung; Suno may split them across words.
let inTag = false
for (const w of sunoWords) {
  if (w.end_s - w.start_s > LONGEST_WORD) w.end_s = w.start_s + LONGEST_WORD
  let clean = ''
  for (const c of w.word) {
    if (c === '[') inTag = true
    else if (c === ']') inTag = false
    else if (!inTag) clean += c
  }
  const letters = [...clean].filter((c) => LETTER.test(c))
  letters.forEach((c, i) => {
    const t0 = w.start_s + ((w.end_s - w.start_s) * i) / letters.length
    const t1 = w.start_s + ((w.end_s - w.start_s) * (i + 1)) / letters.length
    suno.push({ c: fold(c), s: t0, e: t1 })
  })
}

const lines = scriptLines(song).map((line) => ({ ...line, words: displayWords(line.text) }))
const ours = []
lines.forEach((line, li) =>
  line.words.forEach((word, wi) => [...word].forEach((c) => LETTER.test(c) && ours.push({ c: fold(c), li, wi }))),
)

// Needleman–Wunsch with a band-free full matrix (a few thousand letters each: fine).
const n = ours.length
const m = suno.length
const GAP = -1
const score = (a, b) => (a === b ? 2 : -1)
const H = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
for (let i = 1; i <= n; i++) H[i][0] = i * GAP
for (let j = 1; j <= m; j++) H[0][j] = 0 // Suno may sing extra things at the start for free
for (let i = 1; i <= n; i++) {
  const row = H[i]
  const up = H[i - 1]
  const ci = ours[i - 1].c
  for (let j = 1; j <= m; j++) {
    row[j] = Math.max(up[j - 1] + score(ci, suno[j - 1].c), up[j] + GAP, row[j - 1] + GAP)
  }
}
// Free end gap on the Suno side too.
let bestJ = 0
for (let j = 0; j <= m; j++) if (H[n][j] > H[n][bestJ]) bestJ = j
const match = new Array(n).fill(-1)
{
  let i = n
  let j = bestJ
  while (i > 0 && j > 0) {
    if (H[i][j] === H[i - 1][j - 1] + score(ours[i - 1].c, suno[j - 1].c)) {
      if (ours[i - 1].c === suno[j - 1].c) match[i - 1] = j - 1
      i--
      j--
    } else if (H[i][j] === H[i - 1][j] + GAP) i--
    else j--
  }
}
const matched = match.filter((j) => j >= 0).length
console.log(`letters: ours ${n}, suno ${m}, matched ${matched} (${Math.round((matched / n) * 100)}%)`)

// Word times from their matched letters; gaps are interpolated afterwards.
const wordTimes = lines.map((line) => line.words.map(() => ({ s: NaN, e: NaN })))
ours.forEach((o, i) => {
  const j = match[i]
  if (j < 0) return
  const t = wordTimes[o.li][o.wi]
  if (Number.isNaN(t.s)) t.s = suno[j].s
  t.e = suno[j].e
})
const flat = []
wordTimes.forEach((ws, li) => ws.forEach((t, wi) => flat.push({ li, wi, t })))
for (let k = 0; k < flat.length; k++) {
  const t = flat[k].t
  if (!Number.isNaN(t.s)) continue
  let a = k - 1
  while (a >= 0 && Number.isNaN(flat[a].t.e)) a--
  let b = k + 1
  while (b < flat.length && Number.isNaN(flat[b].t.s)) b++
  const from = a >= 0 ? flat[a].t.e : 0
  const to = b < flat.length ? flat[b].t.s : from + 1
  const span = b - a - 1
  const step = (to - from) / Math.max(1, span)
  const pos = k - a - 1
  t.s = from + step * pos
  t.e = from + step * (pos + 1)
  flat[k].interpolated = true
}
const missing = flat.filter((f) => f.interpolated).length
console.log(`words: ${flat.length}, interpolated ${missing}`)

/* ───────────── cut per language ───────────── */

const duration = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', rawPath]).toString(),
)
const byLang = song.order.map((lang) => {
  const idx = lines.map((l, i) => (l.lang === lang ? i : -1)).filter((i) => i >= 0)
  const first = wordTimes[idx[0]][0].s
  const lastLine = idx[idx.length - 1]
  const last = wordTimes[lastLine][wordTimes[lastLine].length - 1].e
  return { lang, idx, first, last }
})
byLang.forEach((part, k) => {
  const prev = byLang[k - 1]
  const next = byLang[k + 1]
  part.from = prev ? Math.max(prev.last + 0.6, part.first - 5) : 0
  // The last part ends after the outro; Suno sometimes starts the song over to fill its length.
  part.to = next ? Math.min(next.first - 0.8, part.last + 5) : Math.min(duration, song.end ?? part.last + 4)
  console.log(`${part.lang}: sung ${part.first.toFixed(2)}–${part.last.toFixed(2)}, file ${part.from.toFixed(2)}–${part.to.toFixed(2)}`)
})

/* ───────────── beat ───────────── */

function pcm(path, from, to, rate = 11025) {
  const buf = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-ss', String(from), '-to', String(to), '-i', path, '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 30 },
  )
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}

/** Onset envelope from energy rises in a few bands, then tempo by autocorrelation and phase by comb. */
function findBeat(samples, rate) {
  const hop = 128
  const win = 512
  const frames = Math.floor((samples.length - win) / hop)
  const bands = [
    [0, 4],
    [4, 16],
    [16, 64],
    [64, 256],
  ]
  const prev = new Float64Array(bands.length)
  const flux = new Float64Array(frames)
  const re = new Float64Array(win)
  const im = new Float64Array(win)
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < win; i++) {
      re[i] = samples[f * hop + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)))
      im[i] = 0
    }
    fft(re, im)
    let sum = 0
    bands.forEach(([a, b], k) => {
      let e = 0
      for (let i = a; i < b; i++) e += re[i] * re[i] + im[i] * im[i]
      const v = Math.log1p(e)
      sum += Math.max(0, v - prev[k])
      prev[k] = v
    })
    flux[f] = sum
  }
  const fps = rate / hop
  // Detrend.
  const mean = flux.reduce((a, b) => a + b, 0) / frames
  const env = flux.map((v) => Math.max(0, v - mean))
  let best = { bpm: 100, score: -1 }
  for (let bpm = 70; bpm <= 170; bpm += 0.25) {
    const lag = (60 / bpm) * fps
    let s = 0
    for (let f = 0; f + lag * 4 < frames; f += 2) {
      const i = Math.round(f + lag)
      const i2 = Math.round(f + lag * 2)
      s += env[f] * (env[i] + 0.5 * env[i2])
    }
    // Children's songs sit near 90–130 bpm: mild preference against halves and doubles.
    s *= Math.exp(-Math.pow(Math.log2(bpm / 110), 2) * 0.6)
    if (s > best.score) best = { bpm, score: s }
  }
  const period = (60 / best.bpm) * fps
  let phase = { at: 0, score: -1 }
  for (let p = 0; p < period; p += 0.25) {
    let s = 0
    for (let t = p; t < frames; t += period) s += env[Math.round(t)] || 0
    if (s > phase.score) phase = { at: p, score: s }
  }
  return { bpm: Math.round(best.bpm * 100) / 100, beat0: Math.round((phase.at / fps) * 1000) / 1000 }
}

function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const cr = Math.cos(ang * k)
        const ci = Math.sin(ang * k)
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k + len / 2] = re[i + k] - ar
        im[i + k + len / 2] = im[i + k] - ai
        re[i + k] += ar
        im[i + k] += ai
      }
    }
  }
}

/* ───────────── write ───────────── */

mkdirSync(resolve(ROOT, 'public/pesenki'), { recursive: true })
mkdirSync(resolve(ROOT, 'src/pesenki-timings'), { recursive: true })
const r3 = (v) => Math.round(v * 1000) / 1000

for (const part of byLang) {
  const { lang, from, to } = part
  const out = resolve(ROOT, `public/pesenki/${song.id}.${lang}.mp3`)
  const length = to - from
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-ss', String(from), '-to', String(to), '-i', rawPath,
    '-af', `afade=t=in:st=0:d=${from > 0 ? 0.6 : 0.05},afade=t=out:st=${Math.max(0, length - 1.6)}:d=1.6,loudnorm=I=-16:TP=-1.5:LRA=11`,
    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '112k', out,
  ])
  const beat = findBeat(pcm(out, 0, length), 11025)
  const timedLines = part.idx.map((li) => {
    const line = lines[li]
    const words = line.words.map((w, wi) => ({ w, s: r3(wordTimes[li][wi].s - from), e: r3(wordTimes[li][wi].e - from) }))
    const entry = { kind: line.kind, s: words[0].s, e: words[words.length - 1].e, words }
    if (line.kind === 'pick') {
      const target = fold(line.word).replace(/[^\p{L}\p{N}]/gu, '')
      const key = line.words.findIndex((w) => [...w].map(fold).join('').replace(/[^\p{L}\p{N}]/gu, '').includes(target))
      if (key < 0) throw new Error(`picture word "${line.word}" not in line "${line.text}"`)
      entry.pic = line.pic
      entry.key = key
    }
    return entry
  })
  const choruses = []
  for (const chorus of [0, 1]) {
    const ids = part.idx.filter((li) => lines[li].chorus === chorus)
    if (!ids.length) continue
    // Never overlap the picture lines around the chorus.
    const before = wordTimes[ids[0] - 1]
    const after = wordTimes[ids[ids.length - 1] + 1]
    const s = Math.max(wordTimes[ids[0]][0].s - 0.35, before ? before[before.length - 1].e + 0.05 : 0) - from
    const lastWords = wordTimes[ids[ids.length - 1]]
    const e = Math.min(lastWords[lastWords.length - 1].e + 0.25, after && lines[ids[ids.length - 1] + 1].lang === part.lang ? after[0].s - 0.1 : Infinity) - from
    choruses.push({ s: r3(Math.max(0, s)), e: r3(e) })
  }
  const timing = {
    song: song.id,
    lang,
    audio: `/pesenki/${song.id}.${lang}.mp3`,
    duration: r3(length),
    bpm: beat.bpm,
    beat0: beat.beat0,
    lines: timedLines,
    choruses,
    ...(song.apart ? { apart: song.apart } : {}),
  }
  writeFileSync(resolve(ROOT, `src/pesenki-timings/${song.id}.${lang}.json`), `${JSON.stringify(timing)}\n`)
  console.log(`${lang}: ${length.toFixed(1)} s, ${beat.bpm} bpm @ ${beat.beat0}s, ${timedLines.length} lines → ${out.replace(ROOT + '/', '')}`)
}
