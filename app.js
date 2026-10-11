// Salon: GitHub Pages'te çalışan, sunucusuz sesli sohbet.
// Ses ve veri tarayıcılar arasında WebRTC ile akar; birbirini bulmak için Trystero (Nostr rölesi) kullanılır.

import CONFIG from './config.js'

const TRYSTERO_URL = 'https://esm.run/trystero@0.26.0'
const NOBLE_URL = 'https://esm.run/@noble/ed25519@2.1.0'
const SUPABASE_URL = 'https://esm.run/@supabase/supabase-js@2.115.0'

// Trystero odalarının benzersiz adı, Supabase projenden türetilir (ayrıca bir şey yazman gerekmez)
const APP_ID = (() => { try { return 'salon-' + new URL(CONFIG.supabaseUrl).hostname.split('.')[0] } catch { return 'salon' } })()

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel)

function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue
    if (k === 'class') n.className = v
    else if (k === 'text') n.textContent = v
    else if (k === 'html') n.innerHTML = v // yalnızca ICONS gibi sabit metinler için
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat()) if (c != null) n.append(c)
  return n
}

const str = (v, max) => (typeof v === 'string' ? v : '').slice(0, max)
const hueOf = s => { let x = 7; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x % 360 }
const initial = s => ([...(s || '?').trim()][0] || '?').toLocaleUpperCase('tr-TR')
const fmtTime = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
const rand = () => Array.from(crypto.getRandomValues(new Uint32Array(3)), n => n.toString(36)).join('')

const LS = {
  get(k, d) { try { const v = localStorage.getItem('salon.' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('salon.' + k, JSON.stringify(v)) } catch { /* özel pencere */ } },
  del(k) { try { localStorage.removeItem('salon.' + k) } catch { /* yoksay */ } }
}

const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`
const ICONS = {
  mic: svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>'),
  micOff: svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="3" x2="21" y1="3" y2="21"/>'),
  headphones: svg('<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'),
  headphonesOff: svg('<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/><line x1="3" x2="21" y1="3" y2="21"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
  sliders: svg('<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>'),
  hash: svg('<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>'),
  speaker: svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  menu: svg('<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="17" y2="17"/>'),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  send: svg('<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
  x: svg('<line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>')
}
const ico = name => ICONS[name] || ''

/* ------------------------------------------------------------------ */
/* Durum                                                               */
/* ------------------------------------------------------------------ */

const textChannels = CONFIG.textChannels || []
const voiceChannels = CONFIG.voiceChannels || []
const textIds = new Set(textChannels.map(c => c.id))
const voiceIds = new Set(voiceChannels.map(c => c.id))
const allChannels = [...textChannels, ...voiceChannels]
const chanName = id => allChannels.find(c => c.id === id)?.name || id

const S = {
  id: '',
  name: '',
  key: '',
  pk: '',
  idSig: '',
  code: '',
  cfg: null,
  admin: false,
  live: false,
  dir: new Map(), // küçük harfli ad -> { name, pk, admin } (Supabase'teki hesap listesi)
  peers: new Map(), // peerId -> { name, pk, ch, muted, deaf, ready }
  adminIds: new Set(),
  srvMuted: new Set(),
  history: new Map(),
  unread: new Set(),
  view: (textChannels[0] || voiceChannels[0] || {}).id,
  me: { muted: false, deaf: false, mutedBefore: false, ch: null },
  voice: null,
  joining: false,
  settings: { sounds: LS.get('sounds', true), mic: LS.get('mic', '') },
  seed: null,
  seenNonces: new Set(),
  speak: new Map()
}

let T = null // trystero modülü
let ed = null // noble ed25519
let sb = null // supabase istemcisi
let lobby = null
const A = {} // lobi aksiyonları
let AC = null // AudioContext
const meters = new Map()

/* ------------------------------------------------------------------ */
/* Hesap: Supabase + imzalı kimlik                                     */
/* ------------------------------------------------------------------ */
// Kayıt/giriş Supabase'teki salon_* fonksiyonlarıyla yapılır (supabase/setup.sql).
// Her hesabın bir Ed25519 anahtar çifti vardır. Açık anahtarlar herkese açık dizindedir; ses odasında
// herkes "ben X'im" derken bu anahtarla imza atar, diğerleri dizindeki anahtarla doğrular.

class AuthError extends Error {}

const enc = new TextEncoder()
const hex = u8 => Array.from(u8, b => b.toString(16).padStart(2, '0')).join('')
const unhex = s => Uint8Array.from(s.match(/../g) || [], x => parseInt(x, 16))
const isHex = (v, n) => typeof v === 'string' && v.length === n && /^[0-9a-f]+$/.test(v)
const normName = n => String(n || '').normalize('NFC').replace(/\s+/g, ' ').trim()
// Veritabanındaki salon.name_key ile aynı kural: büyük/küçük harf ve i/ı/İ farkı yok sayılır
const keyName = n => normName(n).replace(/[İIı]/g, 'i').toLowerCase()
const NAME_RE = /^[A-Za-z0-9çğıöşüÇĞİÖŞÜ][A-Za-z0-9çğıöşüÇĞİÖŞÜ ._-]{1,19}$/
// Mevcut hesapların adı 2-20 karakter olabilir: giriş ve dizin okuma bu kuralı kullanır
const validName = n => NAME_RE.test(n)
// Yeni kayıt ve ad değiştirme için en az 6 karakter
const MIN_NEW_NAME = 6
const validNewName = n => validName(n) && n.length >= MIN_NEW_NAME
const NAME_RULE = 'Kullanıcı adı 2-20 karakter olmalı. Harf (Türkçe dahil), rakam, boşluk, nokta, tire ve alt çizgi kullanılabilir.'
const NEW_NAME_RULE = 'Kullanıcı adı 6-20 karakter olmalı. Harf (Türkçe dahil), rakam, boşluk, nokta, tire ve alt çizgi kullanılabilir.'

const idText = peerId => 'id|' + peerId + '|' + APP_ID
const cmdText = c => ['cmd', c.t, c.target, c.arg, c.ts, c.n].join('|')

async function signHex(text) { return hex(await ed.signAsync(enc.encode(text), S.seed)) }
async function verifyHex(sigHex, text, pkHex) {
  if (!isHex(sigHex, 128) || !isHex(pkHex, 64)) return false
  try { return await ed.verifyAsync(unhex(sigHex), enc.encode(text), unhex(pkHex)) } catch { return false }
}
const isAdmin = () => S.admin

const configured = () => /^https:\/\//.test(CONFIG.supabaseUrl || '') && !!CONFIG.supabaseAnonKey && !/DEGISTIR/i.test((CONFIG.supabaseUrl || '') + (CONFIG.supabaseAnonKey || ''))

const ERR = {
  bad_credentials: 'Kullanıcı adı ya da şifre yanlış.',
  locked: 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar dene.',
  name_taken: 'Bu kullanıcı adı alınmış. Başka bir ad seç.',
  bad_server_password: 'Sunucu şifresi yanlış.',
  invalid_name: NEW_NAME_RULE,
  weak_password: 'Şifre 6-72 karakter olmalı.',
  invalid_key: 'Kimlik anahtarı oluşturulamadı. Sayfayı yenileyip tekrar dene.',
  no_session: 'Oturum açılamadı. Sayfayı yenileyip tekrar dene.',
  bad_reset: 'Kullanıcı adı ya da kod yanlış, ya da kodun süresi dolmuş. Yöneticiden yeni kod iste.'
}

async function loadLibs() {
  if (sb && T && ed) return
  try {
    const [t, e, s] = await Promise.all([import(TRYSTERO_URL), import(NOBLE_URL), import(SUPABASE_URL)])
    T = t
    ed = e
    sb = s.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  } catch (e) {
    console.error(e)
    throw new AuthError('Gerekli kütüphaneler yüklenemedi. İnternetini kontrol edip tekrar dene.')
  }
}

async function ensureSession() {
  const { data } = await sb.auth.getSession()
  if (data?.session) return
  const { error } = await sb.auth.signInAnonymously()
  if (!error) return
  if (/anonymous/i.test(error.message)) throw new AuthError("Supabase'de 'Allow anonymous sign-ins' kapalı. Kurulum rehberindeki 1. adımı yap.")
  if (error.status === 429 || /rate limit/i.test(error.message)) throw new AuthError('Çok fazla giriş denemesi yapıldı. Biraz bekleyip tekrar dene.')
  throw new AuthError('Oturum açılamadı: ' + error.message)
}

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args)
  if (!error) return data
  console.warn(error)
  if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) throw new AuthError('Supabase kurulumu eksik: supabase/setup.sql ve update-1.1.sql çalıştırılmamış.')
  if (/jwt|token/i.test(error.message)) throw new AuthError('Oturum süresi doldu. Sayfayı yenileyip tekrar giriş yap.')
  throw new AuthError('Sunucuya ulaşılamadı: ' + error.message)
}

// Hesap dizini: kim kayıtlı, açık anahtarı ne, yönetici mi
let dirAt = 0
function applyDir(list) {
  const m = new Map()
  for (const e of Array.isArray(list) ? list : []) {
    const name = normName(str(e?.u, 40))
    if (validName(name) && isHex(e?.k, 64)) m.set(keyName(name), { name, pk: e.k, admin: e.a === true })
  }
  S.dir = m
  dirAt = Date.now()
  const mine = m.get(S.key)
  if (mine) S.admin = mine.admin
  S.adminIds.clear()
  if (S.admin) S.adminIds.add(S.id)
  for (const [id, p] of S.peers) if (p.ready && m.get(keyName(p.name))?.admin) S.adminIds.add(id)
}

async function refreshDir() {
  if (Date.now() - dirAt < 8000) return false
  dirAt = Date.now() // eşzamanlı çağrıları sınırlar
  try { applyDir(await rpc('salon_directory')); renderAll(); return true } catch (e) { console.warn(e); return false }
}

async function sendCmd(t, target, arg = '', to) {
  if (!S.admin) return
  const cmd = { t, target, arg, ts: Date.now(), n: rand() }
  cmd.sig = await signHex(cmdText(cmd))
  A.cmd.send(cmd, to ? { target: to } : undefined)
  if (!to) applyCmd(cmd)
}

async function onCmd(c, peerId) {
  if (!c || typeof c !== 'object') return
  const peer = S.peers.get(peerId)
  if (!peer?.ready || !S.adminIds.has(peerId)) return
  const cmd = { t: str(c.t, 12), target: str(c.target, 80), arg: str(c.arg, 80), ts: Number(c.ts), n: str(c.n, 60), sig: str(c.sig, 200) }
  if (!Number.isFinite(cmd.ts) || Math.abs(Date.now() - cmd.ts) > 5 * 60e3 || S.seenNonces.has(cmd.n)) return
  if (!(await verifyHex(cmd.sig, cmdText(cmd), peer.pk))) return
  S.seenNonces.add(cmd.n)
  applyCmd(cmd)
}

function applyCmd(cmd) {
  switch (cmd.t) {
    case 'kick':
      if (cmd.target === S.id && S.voice) { leaveVoice(true); toast('Yönetici seni ses kanalından çıkardı.', 'err') }
      break
    case 'mute':
      S.srvMuted.add(cmd.target)
      if (cmd.target === S.id) { toast('Yönetici seni susturdu.', 'err'); refreshMic() }
      refreshRemoteAudio(cmd.target)
      renderAll()
      break
    case 'unmute':
      S.srvMuted.delete(cmd.target)
      if (cmd.target === S.id) { toast('Yönetici susturmanı kaldırdı.'); refreshMic() }
      refreshRemoteAudio(cmd.target)
      renderAll()
      break
    case 'del':
      for (const [ch, list] of S.history) S.history.set(ch, list.filter(m => m.id !== cmd.arg))
      renderMessages()
      break
  }
}

/* ------------------------------------------------------------------ */
/* Katılımcılar (presence)                                             */
/* ------------------------------------------------------------------ */

const myPresence = () => ({ n: S.name, s: S.idSig, c: S.me.ch, m: S.me.muted, d: S.me.deaf })
const broadcastPresence = () => { if (!S.live) return; try { A.presence?.send(myPresence()) } catch (e) { console.warn(e) } }

const retryingPresence = new Set()
async function onPresence(d, peerId) {
  if (!d || typeof d !== 'object') return
  const name = normName(str(d.n, 40))
  if (!validName(name) || !isHex(d.s, 128)) return
  let entry = S.dir.get(keyName(name))
  if (!entry) {
    if (await refreshDir()) entry = S.dir.get(keyName(name))
    else if (!retryingPresence.has(peerId)) {
      // dizin az önce yenilendi; yeni kayıt olmuş ya da adını değiştirmiş biri olabilir, biraz sonra bir kez daha dene
      retryingPresence.add(peerId)
      setTimeout(() => { retryingPresence.delete(peerId); onPresence(d, peerId) }, 9000)
      return
    }
  }
  if (!entry) return // kayıtlı hesabı olmayan kimse listeye girmez
  if (!(await verifyHex(d.s, idText(peerId), entry.pk))) return // bu bağlantı gerçekten o hesabın sahibi mi

  const prev = S.peers.get(peerId)
  const peer = {
    name: entry.name,
    pk: entry.pk,
    ch: voiceIds.has(d.c) ? d.c : null,
    muted: !!d.m,
    deaf: !!d.d,
    ready: true
  }
  S.peers.set(peerId, peer)
  if (entry.admin) S.adminIds.add(peerId); else S.adminIds.delete(peerId)

  if (S.voice) {
    if (peer.ch === S.voice.ch && prev?.ch !== S.voice.ch) tone('join')
    else if (prev?.ch === S.voice.ch && peer.ch !== S.voice.ch) tone('leave')
    const waiting = S.voice.waiting.get(peerId)
    if (waiting) { S.voice.waiting.delete(peerId); attachRemote(peerId, waiting) }
  }
  refreshRemoteAudio(peerId)
  renderAll()
}

function roster() {
  const list = [{ id: S.id, name: S.name, ch: S.me.ch, muted: S.me.muted, deaf: S.me.deaf, self: true }]
  for (const [id, p] of S.peers) if (p.ready) list.push({ id, ...p })
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

/* ------------------------------------------------------------------ */
/* Sohbet                                                              */
/* ------------------------------------------------------------------ */

function cleanMsg(d, from, forcedName) {
  if (!d || typeof d !== 'object') return null
  const ch = str(d.ch, 40)
  if (!textIds.has(ch) && !voiceIds.has(ch)) return null
  const text = str(d.text, 2000)
  if (!text.trim()) return null
  const id = str(d.id, 64)
  if (!id) return null
  return { id, ch, text, ts: Number.isFinite(d.ts) ? d.ts : Date.now(), name: forcedName || str(d.name, 24) || 'Misafir', from: str(from, 80) }
}

function addMessage(m, { silent = false } = {}) {
  const list = S.history.get(m.ch) || []
  if (list.some(x => x.id === m.id)) return false
  list.push(m)
  list.sort((a, b) => a.ts - b.ts)
  if (list.length > 200) list.splice(0, list.length - 200)
  S.history.set(m.ch, list)
  if (m.ch === S.view) renderMessages({ stick: m.from === S.id })
  else if (!silent) { S.unread.add(m.ch); renderChannels() }
  return true
}

function sendMessage(text) {
  text = text.trim()
  if (!text || !S.view) return
  const msg = { id: rand(), ch: S.view, text: text.slice(0, 2000), ts: Date.now(), name: S.name }
  addMessage({ ...msg, from: S.id })
  A.chat?.send(msg)
}

function sendHistoryTo(id) {
  // Yeni gelene geçmişi, odadaki en küçük kimlikli kişi gönderir (tekrarı azaltmak için)
  const ids = [S.id, ...[...S.peers.keys()].filter(p => p !== id)].sort()
  if (ids[0] !== S.id) return
  const msgs = [...S.history.values()].flat().sort((a, b) => a.ts - b.ts).slice(-200)
  if (!msgs.length) return
  A.hist.send({ m: msgs.map(({ id, ch, text, ts, name, from }) => ({ id, ch, text, ts, name, from })) }, { target: id })
}

function onHistory(d, peerId) {
  if (!S.peers.get(peerId)?.ready) return
  if (!d || !Array.isArray(d.m)) return
  for (const raw of d.m.slice(0, 300)) {
    const m = cleanMsg(raw, raw?.from)
    if (m) addMessage(m, { silent: true })
  }
}

function linkify(text) {
  const frag = document.createDocumentFragment()
  const re = /https?:\/\/[^\s<>"']+/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, '')
    if (m.index > last) frag.append(text.slice(last, m.index))
    frag.append(h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', text: url }))
    last = m.index + url.length
    re.lastIndex = last
  }
  if (last < text.length) frag.append(text.slice(last))
  return frag
}

function renderMessages({ stick = false } = {}) {
  const box = $('#messages')
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90
  const oldTop = box.scrollTop
  box.textContent = ''
  const list = S.history.get(S.view) || []
  if (!list.length) {
    box.append(h('p', { class: 'empty', text: 'Burada henüz mesaj yok. İlk mesajı sen yaz.' }))
    return
  }
  box.append(h('div', { class: 'spacer' }))
  let prev = null
  for (const m of list) {
    const grouped = prev && prev.from === m.from && prev.name === m.name && m.ts - prev.ts < 5 * 60e3
    const del = isAdmin() ? h('button', { class: 'icon-btn del', 'aria-label': 'Mesajı sil', title: 'Mesajı sil', html: ico('x'), onclick: () => sendCmd('del', '', m.id) }) : null
    const gutter = grouped
      ? h('div', { class: 'gutter' }, h('small', { text: fmtTime(m.ts) }))
      : h('div', { class: 'gutter' }, h('span', { class: 'avatar', style: `--h:${hueOf(m.name)}`, text: initial(m.name) }))
    const body = h('div', { class: 'body' }, linkify(m.text))
    const content = grouped
      ? h('div', {}, body)
      : h('div', {},
        h('div', { class: 'head' },
          h('span', { class: 'who', text: m.name }),
          S.adminIds.has(m.from) ? h('span', { class: 'badge', text: 'Yönetici' }) : null,
          h('time', { text: fmtTime(m.ts) })),
        body)
    box.append(h('div', { class: 'msg' + (grouped ? '' : ' first') }, gutter, content, del))
    prev = m
  }
  box.scrollTop = (stick || nearBottom) ? box.scrollHeight : oldTop
}

/* ------------------------------------------------------------------ */
/* Ses                                                                 */
/* ------------------------------------------------------------------ */

function ensureAudio() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)()
  if (AC.state === 'suspended') AC.resume().catch(() => {})
}

const TONES = {
  join: [[523, .09], [784, .13]],
  leave: [[587, .09], [392, .15]],
  mute: [[330, .08]],
  unmute: [[494, .08]]
}
function tone(name) {
  if (!S.settings.sounds || !AC || S.me.deaf) return
  let t = AC.currentTime
  for (const [f, d] of TONES[name] || []) {
    const o = AC.createOscillator()
    const g = AC.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(AC.destination)
    o.start(t)
    o.stop(t + d + 0.03)
    t += d * 0.9
  }
}

async function getMic() {
  const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  if (S.settings.mic) {
    try { return await navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId: { exact: S.settings.mic } } }) } catch { /* cihaz yok, varsayılana dön */ }
  }
  return navigator.mediaDevices.getUserMedia({ audio: base })
}

function micError(e) {
  if (e?.name === 'NotAllowedError') return 'Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin ver.'
  if (e?.name === 'NotFoundError') return 'Mikrofon bulunamadı.'
  return 'Mikrofon açılamadı: ' + (e?.message || e)
}

function addMeter(stream, id) {
  dropMeter(id)
  try {
    const an = AC.createAnalyser()
    an.fftSize = 512
    const src = AC.createMediaStreamSource(stream)
    src.connect(an)
    meters.set(id, { id, an, src, buf: new Uint8Array(an.fftSize), hold: 0, on: false, q: 0 })
  } catch (e) { console.warn('ölçer kurulamadı', e) }
}
function dropMeter(id) {
  const m = meters.get(id)
  if (!m) return
  try { m.src.disconnect() } catch { /* yoksay */ }
  meters.delete(id)
  paintSpeaking(id, false, 0)
}

setInterval(() => {
  if (!meters.size) return
  const now = performance.now()
  for (const m of meters.values()) {
    m.an.getByteTimeDomainData(m.buf)
    let sum = 0
    for (const b of m.buf) { const v = (b - 128) / 128; sum += v * v }
    let lvl = Math.min(1, Math.sqrt(sum / m.buf.length) * 4)
    if (S.srvMuted.has(m.id) || (m.id === S.id && S.me.muted)) lvl = 0
    const loud = lvl > 0.06
    if (loud) m.hold = now + 220
    const on = loud || now < m.hold
    const q = Math.round(lvl * 10) / 10
    if (on !== m.on || q !== m.q) { m.on = on; m.q = q; paintSpeaking(m.id, on, q) }
  }
}, 80)

function paintSpeaking(id, on, q) {
  S.speak.set(id, { on, q })
  for (const el of document.querySelectorAll('[data-uid]')) {
    const uid = el.dataset.uid === 'me' ? S.id : el.dataset.uid
    if (uid !== id) continue
    el.classList.toggle('speaking', on)
    el.style.setProperty('--lvl', q)
    el.closest('.vuser')?.classList.toggle('speaking', on)
  }
}
function applySpeaking() {
  for (const [id, s] of S.speak) if (s.on) paintSpeaking(id, s.on, s.q)
}

function refreshMic() {
  const track = S.voice?.stream.getAudioTracks()[0]
  if (track) track.enabled = !S.me.muted && !S.srvMuted.has(S.id)
}

function refreshRemoteAudio(id) {
  const r = S.voice?.remotes.get(id)
  if (!r) return
  const name = S.peers.get(id)?.name || ''
  r.audio.volume = LS.get('vol.' + name, 1)
  r.audio.muted = S.me.deaf || S.srvMuted.has(id)
}
function refreshAllRemoteAudio() { if (S.voice) for (const id of S.voice.remotes.keys()) refreshRemoteAudio(id) }

function attachRemote(id, stream) {
  const v = S.voice
  if (!v) return
  detachRemote(id)
  const audio = new Audio()
  audio.srcObject = stream
  audio.autoplay = true
  v.remotes.set(id, { audio, stream })
  addMeter(stream, id)
  refreshRemoteAudio(id)
  audio.play().catch(() => toast('Ses başlatılamadı. Sayfada bir yere tıklayıp tekrar dene.', 'err'))
  renderChannels()
}
function detachRemote(id) {
  const r = S.voice?.remotes.get(id)
  if (!r) return
  r.audio.pause()
  r.audio.srcObject = null
  S.voice.remotes.delete(id)
  dropMeter(id)
}

async function joinVoice(chId) {
  if (S.joining || S.voice?.ch === chId) return
  const max = CONFIG.maxPerVoice ?? 8
  const inside = [...S.peers.values()].filter(p => p.ready && p.ch === chId).length
  if (inside >= max) return toast(`Bu kanal dolu (en fazla ${max} kişi).`, 'err')
  if (!navigator.mediaDevices?.getUserMedia) return toast('Bu tarayıcıda ya da bu adreste mikrofon kullanılamıyor. Sayfa https ile açılmalı.', 'err')

  S.joining = true
  try {
    leaveVoice(true)
    ensureAudio()
    let stream
    try { stream = await getMic() } catch (e) { return toast(micError(e), 'err') }

    const room = T.joinRoom(S.cfg, 'voice-' + chId, { onJoinError: () => joinProblem() })
    const v = { ch: chId, room, stream, remotes: new Map(), waiting: new Map() }
    S.voice = v
    S.me.ch = chId
    refreshMic()
    addMeter(stream, S.id)

    room.onPeerJoin = id => room.addStream(stream, { target: id })
    room.onPeerStream = (st, id) => {
      const p = S.peers.get(id)
      if (p?.ready) attachRemote(id, st); else v.waiting.set(id, st) // kimliği doğrulanınca çalınır
    }
    room.onPeerLeave = id => { v.waiting.delete(id); detachRemote(id); renderChannels() }

    broadcastPresence()
    tone('join')
    renderAll()
  } finally {
    S.joining = false
  }
}

function leaveVoice(quiet) {
  const v = S.voice
  if (!v) return
  S.voice = null
  for (const id of [...v.remotes.keys()]) {
    const r = v.remotes.get(id)
    r.audio.pause()
    r.audio.srcObject = null
    dropMeter(id)
  }
  dropMeter(S.id)
  v.stream.getTracks().forEach(t => t.stop())
  try { v.room.leave() } catch { /* yoksay */ }
  S.me.ch = null
  broadcastPresence()
  if (!quiet) tone('leave')
  renderAll()
}

function afterSelfChange() {
  refreshMic()
  refreshAllRemoteAudio()
  broadcastPresence()
  renderAll()
}

function toggleMute() {
  if (S.srvMuted.has(S.id)) return toast('Yönetici seni susturdu.', 'err')
  if (S.me.deaf) { S.me.deaf = false; S.me.muted = false } else S.me.muted = !S.me.muted
  afterSelfChange()
  tone(S.me.muted ? 'mute' : 'unmute')
}

function toggleDeaf() {
  if (S.me.deaf) { S.me.deaf = false; S.me.muted = S.me.mutedBefore } else { S.me.mutedBefore = S.me.muted; S.me.deaf = true; S.me.muted = true }
  afterSelfChange()
  if (!S.me.deaf) tone('unmute')
}

/* ------------------------------------------------------------------ */
/* Arayüz çizimi                                                       */
/* ------------------------------------------------------------------ */

let renderQueued = false
function renderAll() {
  if (renderQueued) return
  renderQueued = true
  requestAnimationFrame(() => {
    renderQueued = false
    renderChannels()
    renderMembers()
    renderMe()
    renderVoiceBar()
    renderHeader()
    applySpeaking()
  })
}

function avatar(name, uid, cls = '') {
  return h('span', { class: 'avatar ' + cls, style: `--h:${hueOf(name)}`, 'data-uid': uid, text: initial(name) })
}

function renderChannels() {
  const tl = $('#textList')
  tl.textContent = ''
  for (const c of textChannels) {
    tl.append(h('li', {}, h('button', {
      class: 'chan' + (S.view === c.id ? ' active' : '') + (S.unread.has(c.id) ? ' unread' : ''),
      onclick: () => viewChannel(c.id)
    }, h('span', { html: ico('hash'), style: 'display:contents' }), h('span', { class: 'name', text: c.name }))))
  }

  const vl = $('#voiceList')
  vl.textContent = ''
  const people = roster()
  for (const c of voiceChannels) {
    const inside = people.filter(p => p.ch === c.id)
    const li = h('li', {}, h('button', {
      class: 'chan' + (S.view === c.id ? ' active' : '') + (S.voice?.ch === c.id ? ' live' : '') + (S.unread.has(c.id) ? ' unread' : ''),
      onclick: () => { viewChannel(c.id); joinVoice(c.id) }
    }, h('span', { html: ico('speaker'), style: 'display:contents' }), h('span', { class: 'name', text: c.name }),
    inside.length ? h('span', { class: 'count', text: inside.length + '/' + (CONFIG.maxPerVoice ?? 8) }) : null))
    if (inside.length) {
      li.append(h('ul', { class: 'vlist' }, inside.map(p => {
        const pending = S.voice?.ch === c.id && !p.self && !S.voice.remotes.has(p.id)
        const muted = p.muted || S.srvMuted.has(p.id)
        return h('li', {}, h('button', { class: 'vuser' + (pending ? ' pending' : ''), onclick: () => openUser(p.id) },
          avatar(p.name, p.self ? 'me' : p.id, 'small'),
          h('span', { class: 'nm', text: p.name }),
          (muted || p.deaf) ? h('span', { class: 'st', html: ico(p.deaf ? 'headphonesOff' : 'micOff'), title: p.deaf ? 'Sesi kapalı' : 'Mikrofonu kapalı' }) : null))
      })))
    }
    vl.append(li)
  }
}

function renderMembers() {
  const people = roster()
  $('#memberTitle').textContent = 'Çevrimiçi (' + people.length + ')'
  $('#emptyHint').hidden = people.length > 1
  const ul = $('#memberList')
  ul.textContent = ''
  for (const p of people) {
    ul.append(h('li', {}, h('button', { class: 'member', onclick: () => openUser(p.id) },
      avatar(p.name, p.self ? 'me' : p.id),
      h('span', { class: 'meta' },
        h('strong', {}, p.name, S.adminIds.has(p.id) ? [' ', h('span', { class: 'badge', text: 'Yönetici' })] : null),
        h('small', { text: p.ch ? 'Sesli: ' + chanName(p.ch) : 'Çevrimiçi' })))))
  }
}

function renderMe() {
  const muted = S.me.muted || S.srvMuted.has(S.id)
  $('#meName').textContent = S.name
  $('#meState').textContent = S.srvMuted.has(S.id) ? 'Yönetici seni susturdu' : isAdmin() ? 'Yönetici' : S.voice ? 'Ses: ' + chanName(S.voice.ch) : 'Çevrimiçi'
  const av = $('#meAvatar')
  av.style.setProperty('--h', hueOf(S.name))
  av.textContent = initial(S.name)
  const mic = $('#micBtn')
  mic.innerHTML = ico(muted ? 'micOff' : 'mic')
  mic.setAttribute('aria-pressed', String(muted))
  mic.setAttribute('aria-label', muted ? 'Mikrofonu aç' : 'Mikrofonu kapat')
  const deaf = $('#deafBtn')
  deaf.innerHTML = ico(S.me.deaf ? 'headphonesOff' : 'headphones')
  deaf.setAttribute('aria-pressed', String(S.me.deaf))
  deaf.setAttribute('aria-label', S.me.deaf ? 'Sesi aç' : 'Sesi kapat')
}

function renderVoiceBar() {
  const bar = $('#voiceBar')
  bar.hidden = !S.voice
  if (!S.voice) return
  const n = roster().filter(p => p.ch === S.voice.ch).length
  $('#vbTitle').textContent = 'Ses bağlı'
  $('#vbSub').textContent = chanName(S.voice.ch) + ', ' + n + ' kişi'
}

function renderHeader() {
  const isVoice = voiceIds.has(S.view)
  $('#chIcon').innerHTML = ico(isVoice ? 'speaker' : 'hash')
  $('#chTitle').textContent = chanName(S.view) || ''
  $('#chSub').textContent = isVoice ? 'Ses kanalı, mesajlar burada da yazılabilir' : 'Metin kanalı'
  $('#msgInput').placeholder = chanName(S.view) + ' kanalına yaz'
}

function viewChannel(id) {
  S.view = id
  S.unread.delete(id)
  renderMessages({ stick: true })
  renderAll()
  closeDrawers()
  if (!matchMedia('(max-width: 960px)').matches) $('#msgInput').focus()
}

/* ------------------------------------------------------------------ */
/* Kullanıcı penceresi ve ayarlar                                      */
/* ------------------------------------------------------------------ */

let userDlgId = null
function openUser(id) {
  const p = roster().find(x => x.id === id)
  if (!p) return
  userDlgId = id
  const dlg = $('#userDlg')
  const av = $('#udAvatar')
  av.textContent = initial(p.name)
  av.style.setProperty('--h', hueOf(p.name))
  av.dataset.uid = p.self ? 'me' : id
  $('#udName').textContent = p.name + (S.adminIds.has(id) ? ' (yönetici)' : '')
  $('#udInfo').textContent = p.ch ? 'Ses kanalında: ' + chanName(p.ch) : 'Çevrimiçi'

  const canVol = !p.self && S.voice && p.ch === S.voice.ch
  $('#udVolume').hidden = !canVol
  if (canVol) {
    const v = Math.round(LS.get('vol.' + p.name, 1) * 100)
    $('#udVol').value = v
    $('#udVolOut').textContent = v + '%'
  }
  const adm = isAdmin() && !p.self
  $('#udAdmin').hidden = !adm
  if (adm) {
    $('#udMute').textContent = S.srvMuted.has(id) ? 'Susturmayı kaldır' : 'Sustur'
    $('#udKick').disabled = !p.ch
  }
  dlg.showModal()
}

async function openSettings() {
  $('#setAccount').textContent = S.name + (isAdmin() ? ' (yönetici)' : '')
  $('#setSounds').checked = S.settings.sounds
  await fillMics()
  $('#settingsDlg').showModal()
}

async function fillMics() {
  const sel = $('#setMic')
  sel.textContent = ''
  sel.append(h('option', { value: '', text: 'Varsayılan' }))
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default')
    devs.forEach((d, i) => sel.append(h('option', { value: d.deviceId, text: d.label || 'Mikrofon ' + (i + 1) })))
  } catch { /* yoksay */ }
  sel.value = S.settings.mic
  if (sel.value !== S.settings.mic) sel.value = ''
}

function saveSettings() {
  S.settings.sounds = $('#setSounds').checked
  LS.set('sounds', S.settings.sounds)
  const mic = $('#setMic').value
  const micChanged = mic !== S.settings.mic
  S.settings.mic = mic
  LS.set('mic', mic)
  broadcastPresence()
  renderAll()
  if (micChanged && S.voice) { const ch = S.voice.ch; leaveVoice(true); joinVoice(ch) }
}

/* ------------------------------------------------------------------ */
/* Kullanıcı adı değiştirme ve şifre sıfırlama                         */
/* ------------------------------------------------------------------ */

// Oturumu açık kullanıcı adını değiştirir. Diğer kişiler yeni adı hesap dizininden doğrular;
// dizin yenilenene kadar presence mesajı onPresence içinde birkaç saniye bekletilir.
async function renameAccount(newName, password) {
  const res = await rpc('salon_rename', { p_new: newName, p_password: password })
  if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
  S.name = normName(res.me.username)
  S.key = keyName(S.name)
  LS.set('name', S.name)
  broadcastPresence()
  dirAt = 0
  await refreshDir()
  renderAll()
}

// Giriş yapmamış kullanıcı, yöneticinin verdiği kodla yeni şifre belirler
async function resetPassword(name, code, password) {
  if (!configured()) throw new AuthError("config.js içine Supabase adresini ve anahtarını yaz (README, 2. adım).")
  await loadLibs()
  await ensureSession()
  const res = await rpc('salon_reset_password', { p_username: name, p_code: code, p_new: password })
  if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
}

/* ------------------------------------------------------------------ */
/* Bildirimler, bağlantı durumu, çekmeceler                            */
/* ------------------------------------------------------------------ */

function toast(text, kind = '') {
  const t = h('div', { class: 'toast ' + kind, text })
  $('#toasts').append(t)
  setTimeout(() => t.remove(), kind === 'err' ? 6500 : 3500)
}

let lastProblem = 0
function joinProblem() {
  if (Date.now() - lastProblem < 20000) return
  lastProblem = Date.now()
  toast('Bazı kişilerle bağlantı kurulamadı. Sunucu şifresi uyuşmuyor ya da ağın doğrudan bağlantıyı engelliyor olabilir (TURN gerekebilir).', 'err')
}

const bootTime = Date.now()
function updateNet() {
  const el = $('#netState')
  let relays = 1 // getRelaySockets yoksa bağlı varsay
  if (typeof T.getRelaySockets === 'function') {
    try { relays = Object.values(T.getRelaySockets()).filter(s => s.readyState === 1).length } catch { /* yoksay */ }
  }
  const others = [...S.peers.values()].filter(p => p.ready).length
  let cls = ''
  let label = 'Bağlanıyor'
  if (relays > 0) { cls = 'ok'; label = others ? 'Bağlı, ' + (others + 1) + ' kişi' : 'Bağlı, henüz kimse yok' }
  else if (Date.now() - bootTime > 15000) { cls = 'bad'; label = 'Röleye ulaşılamıyor' }
  el.className = 'net ' + cls
  $('span', el).textContent = label
}

function openSide() { $('#side').classList.add('open'); $('#scrim').hidden = false }
function openMembers() { $('#members').classList.add('open'); $('#scrim').hidden = false }
function closeDrawers() { $('#side').classList.remove('open'); $('#members').classList.remove('open'); $('#scrim').hidden = true }

/* ------------------------------------------------------------------ */
/* Başlatma, kayıt ve giriş                                            */
/* ------------------------------------------------------------------ */

async function boot(me) {
  S.id = T.selfId
  S.name = normName(me.username)
  S.key = keyName(S.name)
  S.seed = unhex(me.seed)
  S.pk = hex(await ed.getPublicKeyAsync(S.seed))
  if (S.pk !== me.pubkey) throw new AuthError('Hesap anahtarı tutarsız. Yöneticiyle iletişime geç.')
  S.idSig = await signHex(idText(S.id))
  S.admin = me.is_admin === true
  S.code = me.server_password
  S.cfg = { appId: APP_ID, password: S.code }
  if (CONFIG.turnConfig?.length) S.cfg.turnConfig = CONFIG.turnConfig

  applyDir(await rpc('salon_directory'))
  S.live = true

  lobby = T.joinRoom(S.cfg, 'lobby', { onJoinError: () => joinProblem() })
  A.presence = lobby.makeAction('presence')
  A.chat = lobby.makeAction('chat')
  A.hist = lobby.makeAction('hist')
  A.cmd = lobby.makeAction('cmd')

  A.presence.onMessage = (d, { peerId }) => onPresence(d, peerId)
  A.chat.onMessage = (d, { peerId }) => {
    const p = S.peers.get(peerId)
    if (!p?.ready) return // kimliği doğrulanmamış kişinin mesajı alınmaz
    const m = cleanMsg(d, peerId, p.name)
    if (m) addMessage(m)
  }
  A.hist.onMessage = (d, { peerId }) => onHistory(d, peerId)
  A.cmd.onMessage = (d, { peerId }) => onCmd(d, peerId)

  lobby.onPeerJoin = id => {
    if (!S.peers.has(id)) S.peers.set(id, { name: '', ch: null, muted: false, deaf: false, ready: false })
    A.presence.send(myPresence(), { target: id })
    // kimliğimiz karşıda doğrulanana kadar bekle, sonra geçmişi ve susturmaları gönder
    setTimeout(() => {
      if (!S.peers.has(id)) return
      sendHistoryTo(id)
      if (isAdmin()) for (const t of S.srvMuted) sendCmd('mute', t, '', id)
    }, 1500)
    updateNet()
    renderAll()
  }
  lobby.onPeerLeave = id => {
    S.peers.delete(id)
    S.adminIds.delete(id)
    S.srvMuted.delete(id)
    S.voice?.waiting.delete(id)
    if (S.voice) detachRemote(id)
    updateNet()
    renderAll()
  }
}

let loops = false
function startLoops() {
  if (loops) return
  loops = true
  setInterval(broadcastPresence, 20000)
  setInterval(updateNet, 2000)
  setInterval(() => { dirAt = 0; refreshDir() }, 5 * 60e3) // yönetici değişiklikleri vb. için
}

function teardown() {
  S.live = false
  S.admin = false
  try { lobby?.leave() } catch { /* yoksay */ }
  lobby = null
  for (const k of Object.keys(A)) delete A[k]
  S.peers.clear()
  S.adminIds.clear()
  S.dir = new Map()
}

function setBusy(on, text = '') {
  $('#loginBtn').disabled = on
  const st = $('#loginStatus')
  st.hidden = !text
  st.textContent = text
}
function showLoginError(msg) {
  $('#loginStatus').hidden = true
  const el = $('#loginError')
  el.hidden = !msg
  el.textContent = msg || ''
}

function showApp() {
  $('#login').hidden = true
  $('#app').hidden = false
  document.title = CONFIG.serverName || 'Salon'
  $('#serverName').textContent = CONFIG.serverName || 'Salon'
  $('#serverVer').textContent = CONFIG.version ? 'v' + CONFIG.version : ''
  renderHeader()
  renderMe()
}

let entering = false
async function enter({ mode, name, password, code, auto }) {
  if (entering) return
  entering = true
  $('#loginError').hidden = true
  setBusy(true, auto ? 'Giriş yapılıyor…' : 'Bağlanılıyor…')
  try {
    if (!configured()) throw new AuthError("config.js içine Supabase adresini ve anahtarını yaz (README, 2. adım).")
    await loadLibs()
    await ensureSession()
    let me
    if (auto) {
      me = await rpc('salon_me')
      if (!me) return // oturum var ama hesaba giriş yapılmamış: giriş ekranı kalır
    } else {
      setBusy(true, mode === 'register' ? 'Hesap açılıyor…' : 'Giriş yapılıyor…')
      let res
      if (mode === 'register') {
        const seed = crypto.getRandomValues(new Uint8Array(32))
        const pk = hex(await ed.getPublicKeyAsync(seed))
        res = await rpc('salon_register', { p_username: name, p_password: password, p_server_password: code, p_pubkey: pk, p_seed: hex(seed) })
      } else {
        res = await rpc('salon_login', { p_username: name, p_password: password })
      }
      if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
      me = res.me
    }
    setBusy(true, 'Odaya bağlanılıyor…')
    await boot(me)
    LS.set('name', S.name)
    showApp()
    startLoops()
    broadcastPresence()
    updateNet()
    renderAll()
    renderMessages()
  } catch (e) {
    console.warn(e)
    teardown()
    showLoginError(e instanceof AuthError ? e.message : 'Bağlanılamadı. Sayfayı yenileyip tekrar dene.')
  } finally {
    entering = false
    setBusy(false)
  }
}

function wire() {
  // ikonlar
  for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = ico(el.dataset.icon)

  // pencereler
  for (const b of document.querySelectorAll('.dlg .dlg-head .icon-btn')) {
    b.type = 'button'
    b.addEventListener('click', () => b.closest('dialog').close())
  }
  for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', e => { if (e.target === d) d.close() })

  // giriş / kayıt sekmeleri
  let mode = 'login'
  function setMode(m) {
    mode = m
    $('#tabLogin').setAttribute('aria-selected', String(m === 'login'))
    $('#tabRegister').setAttribute('aria-selected', String(m === 'register'))
    $('#pass2Field').hidden = m !== 'register'
    $('#pass2Input').required = m === 'register'
    $('#codeField').hidden = m !== 'register'
    $('#codeInput').required = m === 'register'
    $('#nameHint').hidden = m !== 'register'
    $('#nameInput').minLength = m === 'register' ? MIN_NEW_NAME : 0
    $('#forgotBtn').hidden = m !== 'login'
    $('#passInput').autocomplete = m === 'register' ? 'new-password' : 'current-password'
    $('#loginBtn').textContent = m === 'register' ? 'Kayıt ol' : 'Giriş yap'
    $('#loginError').hidden = true
  }
  $('#tabLogin').addEventListener('click', () => setMode('login'))
  $('#tabRegister').addEventListener('click', () => setMode('register'))

  $('#loginTitle').textContent = CONFIG.serverName || 'Salon'
  $('#nameInput').value = LS.get('name', '')
  setMode('login')

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault()
    $('#loginError').hidden = true
    const name = normName($('#nameInput').value)
    if (mode === 'register') {
      if (!validNewName(name)) return showLoginError(NEW_NAME_RULE)
    } else if (!validName(name)) return showLoginError(NAME_RULE)
    const password = $('#passInput').value
    if (password.length < 6) return showLoginError('Şifre en az 6 karakter olmalı.')
    let code = ''
    if (mode === 'register') {
      if (password !== $('#pass2Input').value) return showLoginError('Şifreler aynı değil.')
      code = $('#codeInput').value.trim()
      if (!code) return showLoginError('Sunucu şifresini yaz.')
    }
    enter({ mode, name, password, code })
  })

  // şifremi unuttum
  $('#forgotBtn').addEventListener('click', () => {
    $('#resetErr').hidden = true
    $('#resetName').value = normName($('#nameInput').value)
    $('#resetDlg').showModal()
  })
  $('#resetCancel').addEventListener('click', () => $('#resetDlg').close())
  $('#resetForm').addEventListener('submit', async e => {
    e.preventDefault()
    const err = $('#resetErr')
    const fail = msg => { err.hidden = false; err.textContent = msg }
    err.hidden = true
    const name = normName($('#resetName').value)
    const code = $('#resetCode').value.trim()
    const pass = $('#resetPass').value
    if (!validName(name)) return fail(NAME_RULE)
    if (!code) return fail('Yöneticiden aldığın kodu yaz.')
    if (pass.length < 6) return fail('Şifre en az 6 karakter olmalı.')
    if (pass !== $('#resetPass2').value) return fail('Şifreler aynı değil.')
    const btn = $('#resetSubmit')
    btn.disabled = true
    try {
      await resetPassword(name, code, pass)
      $('#resetDlg').close()
      $('#resetForm').reset()
      $('#nameInput').value = name
      $('#passInput').value = ''
      setMode('login')
      const st = $('#loginStatus')
      st.hidden = false
      st.textContent = 'Şifren değişti. Yeni şifrenle giriş yapabilirsin.'
    } catch (x) {
      console.warn(x)
      fail(x instanceof AuthError ? x.message : 'İşlem başarısız oldu.')
    } finally {
      btn.disabled = false
    }
  })

  // kullanıcı adı değiştirme
  $('#renameBtn').addEventListener('click', () => {
    $('#settingsDlg').close()
    $('#renameErr').hidden = true
    $('#renameInput').value = S.name
    $('#renamePass').value = ''
    $('#renameDlg').showModal()
  })
  $('#renameCancel').addEventListener('click', () => $('#renameDlg').close())
  $('#renameForm').addEventListener('submit', async e => {
    e.preventDefault()
    const err = $('#renameErr')
    const fail = msg => { err.hidden = false; err.textContent = msg }
    err.hidden = true
    const name = normName($('#renameInput').value)
    const pass = $('#renamePass').value
    if (name === S.name) return fail('Bu zaten şu anki kullanıcı adın.')
    if (!validNewName(name)) return fail(NEW_NAME_RULE)
    if (!pass) return fail('Onay için şifreni yaz.')
    const btn = $('#renameSubmit')
    btn.disabled = true
    try {
      await renameAccount(name, pass)
      $('#renameDlg').close()
      $('#renamePass').value = ''
      toast('Kullanıcı adın değişti.')
    } catch (x) {
      console.warn(x)
      fail(x instanceof AuthError ? x.message : 'İşlem başarısız oldu.')
    } finally {
      btn.disabled = false
    }
  })

  $('#composer').addEventListener('submit', e => {
    e.preventDefault()
    const input = $('#msgInput')
    sendMessage(input.value)
    input.value = ''
  })

  $('#micBtn').addEventListener('click', toggleMute)
  $('#deafBtn').addEventListener('click', toggleDeaf)
  $('#leaveVoice').addEventListener('click', () => leaveVoice())
  $('#settingsBtn').addEventListener('click', openSettings)
  $('#meBtn').addEventListener('click', openSettings)
  $('#menuBtn').addEventListener('click', openSide)
  $('#closeSide').addEventListener('click', closeDrawers)
  $('#membersBtn').addEventListener('click', openMembers)
  $('#closeMembers').addEventListener('click', closeDrawers)
  $('#scrim').addEventListener('click', closeDrawers)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers() })

  $('#saveSettings').addEventListener('click', saveSettings)
  $('#logoutBtn').addEventListener('click', async () => {
    try { await rpc('salon_logout') } catch { /* yoksay */ }
    try { await sb.auth.signOut() } catch { /* yoksay */ }
    location.reload()
  })

  $('#udVol').addEventListener('input', e => {
    const v = Number(e.target.value)
    $('#udVolOut').textContent = v + '%'
    const name = S.peers.get(userDlgId)?.name
    if (name == null) return
    LS.set('vol.' + name, v / 100)
    refreshRemoteAudio(userDlgId)
  })
  $('#udMute').addEventListener('click', () => {
    sendCmd(S.srvMuted.has(userDlgId) ? 'unmute' : 'mute', userDlgId)
    $('#userDlg').close()
  })
  $('#udKick').addEventListener('click', () => {
    sendCmd('kick', userDlgId)
    $('#userDlg').close()
  })

  window.addEventListener('pagehide', () => {
    try { leaveVoice(true) } catch { /* yoksay */ }
    try { lobby?.leave() } catch { /* yoksay */ }
  })

  if (!configured()) {
    showLoginError("config.js içine Supabase adresini ve anahtarını yaz (README, 2. adım).")
    return
  }
  // Bu tarayıcıda daha önce giriş yapılmışsa şifre sormadan devam et
  let hasSession = false
  try { hasSession = !!localStorage.getItem('sb-' + new URL(CONFIG.supabaseUrl).hostname.split('.')[0] + '-auth-token') } catch { /* yoksay */ }
  if (hasSession) enter({ mode: 'login', auto: true })
}

wire()
