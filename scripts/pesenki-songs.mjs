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
sunoWords.forEach((w, wordIndex) => {
  let slipped = false
  if (w.end_s - w.start_s > LONGEST_WORD) {
    if (!w.word.includes('[')) {
      slipped = true
      console.warn(`warning: "${w.word.trim()}" lasted ${(w.end_s - w.start_s).toFixed(1)} s; the aligner may have slipped here`)
    }
    w.end_s = w.start_s + LONGEST_WORD
  }
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
    suno.push({ c: fold(c), s: t0, e: t1, slipped, word: wordIndex })
  })
  w.clean = clean
})

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
  if (suno[j].slipped) t.slipped = true
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

// Suno sometimes sings a chorus line twice. Those words match none of ours: find runs of them
// that spell a chorus line of the same language and add the repeat as its own karaoke line.
{
  const used = new Set(match.filter((j) => j >= 0).map((j) => suno[j].word))
  const plain = (t) => [...t].filter((c) => LETTER.test(c)).map(fold).join('')
  const runs = []
  let run = null
  sunoWords.forEach((w, i) => {
    const text = plain(w.clean ?? '')
    if (!text) return
    if (used.has(i)) {
      run = null
      return
    }
    if (!run) runs.push((run = []))
    run.push(i)
  })
  for (const r of runs) {
    // A run may hold several lines: take chorus lines greedily from its start.
    let k = 0
    while (k < r.length) {
      const t0 = sunoWords[r[k]].start_s
      // The language whose sung lines surround this moment.
      const near = lines.map((l, i) => ({ l, i, t: wordTimes[i][0].s })).filter((x) => x.t <= t0).pop()
      if (!near) break
      const candidates = lines.map((l, i) => ({ l, i })).filter((x) => x.l.lang === near.l.lang && x.l.kind === 'sing' && x.l.chorus !== undefined)
      let found = null
      for (const cand of candidates) {
        const target = plain(cand.l.text)
        let acc = ''
        let m = k
        while (m < r.length && acc.length < target.length) acc += plain(sunoWords[r[m]].clean)
        if (acc === target) {
          found = { cand, from: k, to: m }
          break
        }
        // advance m while accumulating
        acc = ''
        m = k
        while (m < r.length && acc.length < target.length) acc += plain(sunoWords[r[m++]].clean)
        if (acc === target) {
          found = { cand, from: k, to: m }
          break
        }
      }
      if (!found) {
        k++
        continue
      }
      const ids = r.slice(found.from, found.to)
      const source = found.cand.l
      const words = source.words
      const times = words.map((_, wi) => {
        const sw = sunoWords[ids[Math.min(ids.length - 1, Math.round((wi * ids.length) / words.length))]]
        return { s: sw.start_s, e: sw.end_s }
      })
      if (ids.length === words.length) ids.forEach((id, wi) => (times[wi] = { s: sunoWords[id].start_s, e: sunoWords[id].end_s }))
      lines.push({ ...source, words: [...words], repeat: true })
      wordTimes.push(times)
      console.log(`${source.lang}: repeated line "${source.text}" at ${times[0].s.toFixed(2)} s`)
      k = found.to
    }
  }
  // Keep every language's lines in sung order.
  const order = lines.map((l, i) => ({ l, t: wordTimes[i], lang: song.order.indexOf(l.lang), s: wordTimes[i][0].s }))
  order.sort((a, b) => a.lang - b.lang || a.s - b.s)
  lines.splice(0, lines.length, ...order.map((o) => o.l))
  wordTimes.splice(0, wordTimes.length, ...order.map((o) => o.t))
}

// Both choruses of a language are sung the same way. When the aligner slips in one of them
// (a word stretched over seconds and the line shifted), rebuild that line from the other chorus.
// Lines without a slipped word are left alone: Suno sometimes really sings a chorus differently.
for (const lang of song.order) {
  const chorus = (n) => lines.map((l, i) => (l.lang === lang && l.chorus === n ? i : -1)).filter((i) => i >= 0)
  const a = chorus(0)
  const b = chorus(1)
  if (a.length !== b.length || !a.length) continue
  const starts = (ids) => ids.map((li) => wordTimes[li][0].s - wordTimes[ids[0]][0].s)
  const spread = (ids) => {
    const st = starts(ids)
    const gaps = st.slice(1).map((v, i) => v - st[i])
    const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length
    return Math.sqrt(gaps.reduce((x, y) => x + (y - mean) ** 2, 0) / gaps.length)
  }
  const [good, bad] = spread(a) <= spread(b) ? [a, b] : [b, a]
  const goodBase = wordTimes[good[0]][0].s
  const badBase = wordTimes[bad[0]][0].s
  good.forEach((gl, j) => {
    const bl = bad[j]
    const gw = wordTimes[gl]
    const bw = wordTimes[bl]
    if (gw.length !== bw.length) return
    const off = Math.max(...gw.map((w, k) => Math.abs(w.s - goodBase - (bw[k].s - badBase))))
    // A long last word is a held note, not a slip: only stretched words inside a line count.
    const nearSlip = [bl - 1, bl].some((li) => wordTimes[li]?.some((w, k, all) => w.slipped && k < all.length - 1))
    if (off <= 1 || !nearSlip) return
    const rebuilt = bw.map((w, k) => ({ ...w, s: badBase + (gw[k].s - goodBase), e: badBase + (gw[k].e - goodBase) }))
    const before = wordTimes[bl - 1]
    const after = wordTimes[bl + 1]
    const clashes = (before && rebuilt[0].s < before[before.length - 1].s) || (after && rebuilt[rebuilt.length - 1].s > after[0].s)
    if (clashes) return
    rebuilt.forEach((w, k) => Object.assign(bw[k], w))
    console.log(`${lang}: chorus line "${lines[bl].text}" was off by ${off.toFixed(2)} s, rebuilt from the other chorus`)
  })
}

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
/** One recording has one tempo: pass `bpm` to fit only the downbeat of a part. */
function findBeat(samples, rate, bpm = 0) {
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
  // Coarse tempo on whole-frame lags, then a fine comb with fractional positions:
  // a 0.25 bpm error drifts by a whole beat over a song, so the fine step matters.
  let best = { bpm: bpm || 100, score: -1 }
  for (let b = 70; !bpm && b <= 170; b += 0.5) {
    const lag = Math.round((60 / b) * fps)
    let s = 0
    for (let f = 0; f + lag * 2 < frames; f++) s += env[f] * (env[f + lag] + 0.5 * env[f + lag * 2])
    // Children's songs sit near 90–130 bpm: mild preference against halves and doubles.
    s *= Math.exp(-Math.pow(Math.log2(b / 110), 2) * 0.6)
    if (s > best.score) best = { bpm: b, score: s }
  }
  const at = (x) => {
    const i = Math.floor(x)
    const t = x - i
    return (env[i] || 0) * (1 - t) + (env[i + 1] || 0) * t
  }
  let fine = { bpm: best.bpm, at: 0, score: -1 }
  const [from, to, step] = bpm ? [bpm, bpm, 1] : [best.bpm - 1.5, best.bpm + 1.5, 0.01]
  for (let b = from; b <= to + 1e-9; b += step) {
    const period = (60 / b) * fps
    for (let p = 0; p < period; p += 0.5) {
      let s = 0
      for (let t = p; t < frames - 1; t += period) s += at(t)
      if (s > fine.score) fine = { bpm: b, at: p, score: s }
    }
  }
  // Frame f covers samples f*hop … f*hop+win: its onset sits near the middle.
  const beat0 = (fine.at * hop + win / 2) / rate
  return { bpm: Math.round(fine.bpm * 100) / 100, beat0: Math.round(beat0 * 1000) / 1000 }
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
// The tempo of the whole recording (all languages): steadier than any single part.
const songEnd = byLang[byLang.length - 1].to
const tempo = findBeat(pcm(rawPath, 0, songEnd), 11025).bpm
console.log(`tempo of the recording: ${tempo} bpm`)

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
  const beat = findBeat(pcm(out, 0, length), 11025, tempo)
  const timedLines = part.idx.map((li) => {
    const line = lines[li]
    const words = line.words.map((w, wi) => ({ w, s: r3(wordTimes[li][wi].s - from), e: r3(wordTimes[li][wi].e - from) }))
    const entry = { kind: line.kind, s: words[0].s, e: words[words.length - 1].e, words }
    if (line.repeat) entry.repeat = true
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
