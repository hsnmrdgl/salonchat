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
  speakerOff: svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  screen: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'),
  expand: svg('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>'),
  pip: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="11" y="12" width="8" height="6" rx="1"/>'),
  menu: svg('<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="17" y2="17"/>'),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  send: svg('<line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
  x: svg('<line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>'),
  copy: svg('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>')
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
const adminOnly = new Set(allChannels.filter(c => c.adminOnly).map(c => c.id)) // sadece yöneticilerin yazabildiği kanallar
const RETENTION = 7 * 24 * 3600e3 // mesajlar en fazla 1 hafta saklanır (sunucu da 7 günden eskiyi siler)
const IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']) // SVG bilerek yok: içinde kod olabilir

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
  view: (textChannels[0] || {}).id, // sesli kanallarda metin yok, görünüm hep bir metin kanalıdır
  me: { muted: false, deaf: false, mutedBefore: false, ch: null },
  voice: null,
  joining: false,
  settings: {
    sounds: LS.get('sounds', true),
    mic: LS.get('mic', ''),
    micVol: LS.get('micVol', 1), // mikrofon seviyesi, 0-2
    outVol: LS.get('outVol', 1), // hoparlör seviyesi, 0-2
    ns: LS.get('ns', true), // tarayıcının otomatik gürültü engellemesi
    gate: LS.get('gate', false), // manuel ses eşiği açık mı
    thresh: LS.get('thresh', -50) // ses eşiği, dB (-70 ile -10 arası)
  },
  seed: null,
  seenNonces: new Set(),
  deleted: new Set(), // silinen mesaj kimlikleri (eski bir yenilemeyle geri gelmesin diye)
  imgs: new Map(), // mesaj kimliği -> görselin data adresi (son kullanılanlar bellekte tutulur)
  share: null, // ekran paylaşıyorsam: { stream, track, room, q, viewers }
  watch: null, // bir yayını izliyorsam: { id, ch, room, stream, fps }
  speak: new Map(),
  avatars: new Map() // küçük harfli ad -> { v: sürüm, url: data adresi } (profil fotoğrafları)
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
const isAdminName = name => S.dir.get(keyName(name))?.admin === true // hesap dizinine göre bu ad yöneticiye mi ait

const configured = () => /^https:\/\//.test(CONFIG.supabaseUrl || '') && !!CONFIG.supabaseAnonKey && !/DEGISTIR/i.test((CONFIG.supabaseUrl || '') + (CONFIG.supabaseAnonKey || ''))

const ERR = {
  bad_credentials: 'Kullanıcı adı ya da şifre yanlış.',
  locked: 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar dene.',
  name_taken: 'Bu kullanıcı adı alınmış. Başka bir ad seç.',
  bad_invite: 'Davet kodu yanlış ya da daha önce kullanılmış.',
  not_admin: 'Bu işlem için yönetici olmalısın.',
  try_again: 'Kod üretilemedi, tekrar dene.',
  invalid_name: NEW_NAME_RULE,
  weak_password: 'Şifre 6-72 karakter olmalı.',
  invalid_key: 'Kimlik anahtarı oluşturulamadı. Sayfayı yenileyip tekrar dene.',
  no_session: 'Oturum açılamadı. Sayfayı yenileyip tekrar dene.',
  bad_reset: 'Kullanıcı adı ya da kod yanlış, ya da kodun süresi dolmuş. Yöneticiden yeni kod iste.',
  admin_only: 'Bu kanala sadece yöneticiler yazabilir.',
  rate_limited: 'Çok hızlı mesaj yazıyorsun, biraz bekle.',
  invalid_message: 'Mesaj 1-2000 karakter olmalı.',
  invalid_channel: 'Geçersiz kanal.',
  forbidden: 'Bu mesajı silme yetkin yok.',
  invalid_image: 'Görsel geçersiz ya da çok büyük (en fazla yaklaşık 1 MB). JPEG, PNG, GIF ve WebP desteklenir.',
  invalid_avatar: 'Fotoğraf geçersiz ya da çok büyük.',
  avatar_rate: 'Fotoğrafı çok sık değiştirdin, biraz bekle.'
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
  if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) throw new AuthError('Supabase kurulumu eksik: supabase klasöründeki SQL dosyaları (setup.sql, update-1.1.sql, update-1.2.sql, update-1.3.sql, update-1.4.sql, update-1.5.sql, update-1.6.sql) sırayla çalıştırılmamış.')
  if (/jwt|token/i.test(error.message)) throw new AuthError('Oturum süresi doldu. Sayfayı yenileyip tekrar giriş yap.')
  throw new AuthError('Sunucuya ulaşılamadı: ' + error.message)
}

// Hesap dizini: kim kayıtlı, açık anahtarı ne, yönetici mi
let dirAt = 0
function applyDir(list) {
  const m = new Map()
  for (const e of Array.isArray(list) ? list : []) {
    const name = normName(str(e?.u, 40))
    if (validName(name) && isHex(e?.k, 64)) m.set(keyName(name), { name, pk: e.k, admin: e.a === true, v: Number(e.v) > 0 ? Number(e.v) : 0 })
  }
  S.dir = m
  dirAt = Date.now()
  const mine = m.get(S.key)
  if (mine) S.admin = mine.admin
  S.adminIds.clear()
  if (S.admin) S.adminIds.add(S.id)
  for (const [id, p] of S.peers) if (p.ready && m.get(keyName(p.name))?.admin) S.adminIds.add(id)
  syncAvatars()
}

async function refreshDir() {
  if (Date.now() - dirAt < 8000) return false
  dirAt = Date.now() // eşzamanlı çağrıları sınırlar
  try { applyDir(await rpc('salon_directory')); renderAll(); return true } catch (e) { console.warn(e); return false }
}

/* ---- Profil fotoğrafları ---- */
// Fotoğraf 160x160 kare (en büyük gösterim 52 px; 3x ekranlarda bile yeter), WebP/JPEG, genelde 5-15 KB.
// Dizin yalnızca sürüm numarasını taşır; fotoğraflar değiştikçe toplu olarak ayrıca indirilir.
const AVATAR_PX = 160
const AVATAR_MAX_B64 = 40000
const AVATAR_TYPES = new Set(['image/jpeg', 'image/webp'])

const avatarUrl = name => S.avatars.get(keyName(name))?.url || ''

function paintAvatar(el, name) {
  const url = avatarUrl(name)
  el.style.setProperty('--h', hueOf(name))
  el.style.backgroundImage = url ? 'url("' + url + '")' : ''
  el.textContent = url ? '' : initial(name)
}

let avSync = false
let avAgain = false
async function syncAvatars() {
  if (avSync) { avAgain = true; return }
  const need = []
  for (const [k, e] of S.dir) {
    const c = S.avatars.get(k)
    if (!e.v) { if (c) S.avatars.delete(k); continue }
    if (!c || c.v !== e.v) need.push(e.name)
  }
  for (const k of [...S.avatars.keys()]) if (!S.dir.has(k)) S.avatars.delete(k)
  if (!need.length) return
  avSync = true
  try {
    const list = await rpc('salon_avatars', { p_names: need.slice(0, 100) })
    for (const it of Array.isArray(list) ? list : []) {
      const key = keyName(normName(str(it?.u, 40)))
      if (!S.dir.has(key) || !AVATAR_TYPES.has(it?.t) || typeof it?.d !== 'string' || it.d.length > 50000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(it.d)) continue
      S.avatars.set(key, { v: Number(it.v) || 0, url: 'data:' + it.t + ';base64,' + it.d })
    }
    renderAll()
    renderMessages()
  } catch (e) { console.warn(e) } finally {
    avSync = false
    if (avAgain) { avAgain = false; syncAvatars() }
  }
}

// Fotoğrafı ortadan kare keser, 160x160'a küçültür ve boyut sınırına inene kadar kaliteyi düşürür
async function prepareAvatar(file) {
  if (!file.type.startsWith('image/')) throw new AuthError('Bu bir görsel dosyası değil.')
  let bmp
  try { bmp = await createImageBitmap(file) } catch { throw new AuthError('Bu görsel biçimi desteklenmiyor. JPEG, PNG, GIF ya da WebP dene.') }
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = AVATAR_PX
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX)
  bmp.close?.()
  for (const q of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await encodeCanvas(canvas, q)
    if (!blob || !AVATAR_TYPES.has(blob.type)) continue
    const b64 = await blobToBase64(blob)
    if (b64.length <= AVATAR_MAX_B64) return { type: blob.type, b64 }
  }
  throw new AuthError('Fotoğraf yeterince küçültülemedi.')
}

let avPing = 0
function afterAvatarChange() {
  try { A.avtr?.send({}) } catch (e) { console.warn(e) } // diğerleri dizini hemen yenilesin
  dirAt = 0
  refreshDir()
  renderAll()
  renderMessages()
}

async function setAvatar(file) {
  const { type, b64 } = await prepareAvatar(file)
  const res = await rpc('salon_set_avatar', { p_type: type, p_data: b64 })
  if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
  S.avatars.set(S.key, { v: Number(res.v) || 0, url: 'data:' + type + ';base64,' + b64 })
  afterAvatarChange()
}

async function removeAvatar() {
  const res = await rpc('salon_set_avatar', { p_type: null, p_data: null })
  if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
  S.avatars.delete(S.key)
  afterAvatarChange()
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
  }
}

/* ------------------------------------------------------------------ */
/* Katılımcılar (presence)                                             */
/* ------------------------------------------------------------------ */

const myPresence = () => ({ n: S.name, s: S.idSig, c: S.me.ch, m: S.me.muted, d: S.me.deaf, sh: S.share ? S.share.q : '', tk: S.share ? S.share.takeover : '' })
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
    share: voiceIds.has(d.c) && isShareQ(d.sh) ? d.sh : '', // ekran paylaşıyorsa kalite anahtarı
    takeover: str(d.tk, 80), // paylaşımı devraldığı kişinin kimliği (o kişinin yayını kapanır)
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
  if (S.voice && peer.ch === S.voice.ch && peer.share && !prev?.share) {
    toast(peer.name + ' ekran paylaşıyor. İzlemek için soldaki "İzle" düğmesine bas.')
  }
  if (S.share && S.voice && peer.ch === S.voice.ch && peer.share) {
    if (peer.takeover === S.id) {
      // biri paylaşımı devraldı: önceki paylaşanın yayını kapanır
      stopShare(true)
      toast(peer.name + ' ekran paylaşımını devraldı, senin paylaşımın kapandı.')
    } else if (S.share.takeover !== peerId && peerId < S.id) {
      // devralma olmadan aynı anda başlatılmışsa kimliği küçük olan sürer, diğeri durur
      stopShare(true)
      toast(peer.name + ' aynı anda paylaşmaya başladı, senin paylaşımın durduruldu.', 'err')
    }
  }
  if (S.watch?.id === peerId && (!peer.share || peer.ch !== S.watch.ch)) {
    closeWatch()
    toast(peer.name + ' paylaşımı bitirdi.')
  }
  refreshRemoteAudio(peerId)
  renderAll()
}

function roster() {
  const list = [{ id: S.id, name: S.name, ch: S.me.ch, muted: S.me.muted, deaf: S.me.deaf, share: S.share ? S.share.q : '', self: true }]
  for (const [id, p] of S.peers) if (p.ready) list.push({ id, ...p })
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

/* ------------------------------------------------------------------ */
/* Sohbet                                                              */
/* ------------------------------------------------------------------ */

function cleanMsg(d, from, forcedName) {
  if (!d || typeof d !== 'object') return null
  const ch = str(d.ch, 40)
  if (!textIds.has(ch)) return null // mesajlar yalnızca metin kanallarına yazılır
  const text = str(d.text, 2000)
  const img = IMG_TYPES.has(d.img) ? d.img : null // görsel varsa türü; görselin kendisi ayrıca istenir
  if (!text.trim() && !img) return null
  const id = str(d.id, 64)
  if (!id) return null
  return { id, ch, text, img, ts: Number.isFinite(d.ts) ? d.ts : Date.now(), name: forcedName || str(d.name, 24) || 'Misafir', from: str(from, 80) }
}

function addMessage(m, { silent = false } = {}) {
  if (S.deleted.has(m.id) || m.ts < Date.now() - RETENTION) return false
  if (!m.at) m.at = Date.now() // canlı geldiği an, sunucu yenilemesi bu mesajı kısa süre korur
  const list = S.history.get(m.ch) || []
  if (list.some(x => x.id === m.id)) return false
  list.push(m)
  list.sort((a, b) => a.ts - b.ts)
  if (list.length > 200) list.splice(0, list.length - 200)
  S.history.set(m.ch, list)
  if (m.ch === S.view) renderMessages({ stick: keyName(m.name) === S.key })
  else if (!silent) { S.unread.add(m.ch); renderChannels() }
  return true
}

/* ---- Görseller ---- */

const MAX_IMG_BYTES = 1024 * 1024 // gönderilecek görselin üst sınırı (sunucu da kontrol eder)
const IMG_CACHE_MAX = 40
const imgFetch = new Map()
let pending = null // gönderilmeyi bekleyen görsel: { type, b64, url, size }
let preparing = false

const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
const toBlob = (canvas, type, q) => new Promise(res => canvas.toBlob(res, type, q))
const blobToBase64 = blob => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1] || '')
  r.onerror = () => rej(r.error)
  r.readAsDataURL(blob)
})

// WebP kodlaması olmayan tarayıcıda toBlob sessizce PNG döner; o durumda şeffaflık beyaza çevrilip JPEG'e düşülür
async function encodeCanvas(canvas, q) {
  const b = await toBlob(canvas, 'image/webp', q)
  if (b && b.type === 'image/webp') return b
  const ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return toBlob(canvas, 'image/jpeg', q)
}

// Görseli göndermeye uygun hale getirir: büyükse küçültür ve sıkıştırır. Küçük JPEG/PNG/WebP ile küçük GIF olduğu gibi gider.
async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new AuthError('Bu bir görsel dosyası değil.')
  let note = ''
  if (file.type === 'image/gif') {
    if (file.size <= MAX_IMG_BYTES) return { type: 'image/gif', blob: file, note }
    note = 'GIF çok büyük, animasyon olmadan ilk karesi gönderilecek.'
  }
  let bmp
  try { bmp = await createImageBitmap(file) } catch { throw new AuthError('Bu görsel biçimi desteklenmiyor. JPEG, PNG, GIF ya da WebP dene.') }
  const longest = Math.max(bmp.width, bmp.height)
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 700 * 1024 && longest <= 1600) {
    bmp.close?.()
    return { type: file.type, blob: file, note }
  }
  for (const [dim, q] of [[1600, 0.85], [1280, 0.75], [960, 0.65], [720, 0.6]]) {
    const scale = Math.min(1, dim / longest)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await encodeCanvas(canvas, q)
    if (blob && IMG_TYPES.has(blob.type) && blob.size <= MAX_IMG_BYTES) { bmp.close?.(); return { type: blob.type, blob, note } }
  }
  bmp.close?.()
  throw new AuthError('Görsel çok büyük, yeterince küçültülemedi.')
}

function clearPending() {
  if (pending?.url) URL.revokeObjectURL(pending.url)
  pending = null
  $('#attachBar').hidden = true
}

async function setPending(file) {
  if (!file || preparing) return
  if (!textIds.has(S.view)) return
  if (adminOnly.has(S.view) && !isAdmin()) return toast(ERR.admin_only, 'err')
  preparing = true
  const bar = $('#attachBar')
  bar.hidden = false
  $('#attachThumb').removeAttribute('src')
  $('#attachName').textContent = 'Görsel hazırlanıyor…'
  try {
    const { type, blob, note } = await prepareImage(file)
    const b64 = await blobToBase64(blob)
    clearPending()
    pending = { type, b64, url: URL.createObjectURL(blob), size: blob.size }
    bar.hidden = false
    $('#attachThumb').src = pending.url
    $('#attachName').textContent = (file.name || 'Görsel') + ' · ' + fmtSize(blob.size)
    if (note) toast(note)
    $('#msgInput').focus()
  } catch (e) {
    console.warn(e)
    clearPending()
    toast(e instanceof AuthError ? e.message : 'Görsel hazırlanamadı.', 'err')
  } finally {
    preparing = false
  }
}

function cacheImg(id, url) {
  S.imgs.delete(id)
  S.imgs.set(id, url)
  while (S.imgs.size > IMG_CACHE_MAX) S.imgs.delete(S.imgs.keys().next().value)
}

function fetchImage(id) {
  const hit = S.imgs.get(id)
  if (hit) return Promise.resolve(hit)
  if (!imgFetch.has(id)) {
    imgFetch.set(id, (async () => {
      try {
        const r = await rpc('salon_message_image', { p_id: id })
        if (r?.data && IMG_TYPES.has(r.type)) {
          const url = 'data:' + r.type + ';base64,' + r.data
          cacheImg(id, url)
          return url
        }
      } catch (e) { console.warn(e) } finally { imgFetch.delete(id) }
      return null
    })())
  }
  return imgFetch.get(id)
}

// Resimler sonradan yüklenince yükseklik değişir; sohbet en alttaysa en altta kalsın
function keepBottom() {
  const box = $('#messages')
  if (box.dataset.stuck === '1') box.scrollTop = box.scrollHeight
}

function chatImage(m) {
  const wrap = h('button', { type: 'button', class: 'chat-img', 'aria-label': 'Görseli büyüt' })
  const show = url => {
    wrap.classList.remove('loading')
    wrap.textContent = ''
    const im = h('img', { src: url, alt: 'Gönderilen görsel' })
    im.addEventListener('load', keepBottom)
    wrap.append(im)
  }
  wrap.addEventListener('click', () => { const u = S.imgs.get(m.id); if (u) openImage(u) })
  const cached = S.imgs.get(m.id)
  if (cached) show(cached)
  else {
    wrap.classList.add('loading')
    wrap.textContent = 'Görsel yükleniyor…'
    fetchImage(m.id).then(url => {
      if (url) show(url)
      else { wrap.classList.remove('loading'); wrap.textContent = 'Görsel yüklenemedi' }
    })
  }
  return wrap
}

function openImage(url) {
  $('#imgBig').src = url
  $('#imgDlg').showModal()
}

// Mesaj önce sunucuya kaydedilir (7 gün saklanır), sonra anında görünsün diye odadakilere de yayınlanır.
async function sendMessage(text, img = null) {
  text = text.trim()
  const ch = S.view
  if ((!text && !img) || !textIds.has(ch)) return false
  if (adminOnly.has(ch) && !isAdmin()) { toast(ERR.admin_only, 'err'); return false }
  let res
  try {
    res = img
      ? await rpc('salon_send_image', { p_channel: ch, p_text: text.slice(0, 2000), p_type: img.type, p_data: img.b64 })
      : await rpc('salon_send_message', { p_channel: ch, p_text: text.slice(0, 2000) })
  } catch (e) {
    toast(e instanceof AuthError ? e.message : 'Mesaj gönderilemedi.', 'err')
    return false
  }
  if (!res?.ok) { toast(ERR[res?.error] || 'Mesaj gönderilemedi.', 'err'); return false }
  const m = cleanMsg(res.msg, S.id, S.name)
  if (!m) return false
  if (img) cacheImg(m.id, 'data:' + img.type + ';base64,' + img.b64) // gönderen için hemen görünsün
  addMessage(m)
  // Görselin kendisi yayınlanmaz, yalnızca türü: alıcılar sunucudan çeker
  A.chat?.send({ id: m.id, ch: m.ch, text: m.text, img: m.img, ts: m.ts, name: S.name })
  return true
}

const findMessage = id => { for (const l of S.history.values()) { const m = l.find(x => x.id === id); if (m) return m } return null }

function removeMessage(id) {
  S.deleted.add(id)
  for (const [ch, list] of S.history) {
    const next = list.filter(x => x.id !== id)
    if (next.length !== list.length) S.history.set(ch, next)
  }
  renderMessages()
}

// Silme yetkisini sunucu verir: yazarın kendisi ya da yönetici
async function deleteMessage(m) {
  let res
  try { res = await rpc('salon_delete_message', { p_id: m.id }) } catch (e) {
    return toast(e instanceof AuthError ? e.message : 'Mesaj silinemedi.', 'err')
  }
  if (!res?.ok) return toast(ERR[res?.error] || 'Mesaj silinemedi.', 'err')
  removeMessage(m.id)
  A.mdel?.send({ id: m.id })
}

// Sunucudaki son 7 günün mesajlarını getirir ve yerel listeyi buna eşitler. Başlangıçta, sonra 30 saniyede bir
// ve sekmeye dönünce çalışır; kaçırılan mesajlar ve silmeler böylece yakalanır.
async function loadMessages({ first = false } = {}) {
  if (!S.live) return
  let list
  try { list = await rpc('salon_messages') } catch (e) {
    console.warn(e)
    if (first) toast('Mesaj geçmişi yüklenemedi: ' + (e?.message || e), 'err')
    return
  }
  if (!Array.isArray(list)) return
  const now = Date.now()
  const known = new Set([...S.history.values()].flat().map(m => m.id))
  const before = (S.history.get(S.view) || []).map(m => m.id).join()
  const next = new Map()
  const put = m => { const l = next.get(m.ch) || []; l.push(m); next.set(m.ch, l) }
  for (const raw of list) {
    const m = cleanMsg(raw, '', normName(str(raw?.name, 40)))
    if (m && !S.deleted.has(m.id) && m.ts >= now - RETENTION) put(m)
  }
  // az önce canlı gelip henüz listede görünmeyen mesajları koru; sunucuda hiç olmayan (sahte) mesajlar bu süre sonunda düşer
  for (const l of S.history.values()) {
    for (const m of l) {
      if (m.at && now - m.at < 15000 && !S.deleted.has(m.id) && !(next.get(m.ch) || []).some(x => x.id === m.id)) put(m)
    }
  }
  for (const l of next.values()) {
    l.sort((a, b) => a.ts - b.ts)
    if (l.length > 200) l.splice(0, l.length - 200)
  }
  S.history = next
  if (!first) {
    for (const [ch, l] of next) if (ch !== S.view && l.some(m => !known.has(m.id) && keyName(m.name) !== S.key)) S.unread.add(ch)
  }
  if ((S.history.get(S.view) || []).map(m => m.id).join() !== before) renderMessages()
  renderChannels()
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
    const readOnly = adminOnly.has(S.view) && !isAdmin()
    box.append(h('p', { class: 'empty', text: readOnly ? 'Burada henüz duyuru yok.' : 'Burada henüz mesaj yok. İlk mesajı sen yaz.' }))
    return
  }
  box.append(h('div', { class: 'spacer' }))
  let prev = null
  for (const m of list) {
    const grouped = prev && prev.name === m.name && m.ts - prev.ts < 5 * 60e3
    const mine = keyName(m.name) === S.key
    const del = (isAdmin() || mine) ? h('button', { class: 'icon-btn del', 'aria-label': 'Mesajı sil', title: mine ? 'Mesajını sil' : 'Mesajı sil', html: ico('x'), onclick: () => deleteMessage(m) }) : null
    const gutter = grouped
      ? h('div', { class: 'gutter' }, h('small', { text: fmtTime(m.ts) }))
      : h('div', { class: 'gutter' }, avatar(m.name, null))
    const body = h('div', { class: 'body' }, m.text ? linkify(m.text) : null, m.img ? chatImage(m) : null)
    const content = grouped
      ? h('div', {}, body)
      : h('div', {},
        h('div', { class: 'head' },
          h('span', { class: 'who', text: m.name }),
          isAdminName(m.name) ? h('span', { class: 'badge', text: 'Yönetici' }) : null,
          h('time', { text: fmtTime(m.ts) })),
        body)
    box.append(h('div', { class: 'msg' + (grouped ? '' : ' first') }, gutter, content, del))
    prev = m
  }
  box.dataset.stuck = (stick || nearBottom) ? '1' : '0'
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
    o.connect(g).connect(getOut())
    o.start(t)
    o.stop(t + d + 0.03)
    t += d * 0.9
  }
}

// Tüm sesler (kişiler, bildirim sesleri, test) önce bu ana düğümden geçer: hoparlör seviyesi burada uygulanır.
// Sonda bir sınırlayıcı var, böylece %200 seviyeler aşırı yüksek patlama yapmaz.
let OUT = null
function getOut() {
  ensureAudio()
  if (!OUT) {
    const g = AC.createGain()
    const lim = AC.createDynamicsCompressor()
    lim.threshold.value = -6
    lim.knee.value = 6
    lim.ratio.value = 20
    lim.attack.value = 0.003
    lim.release.value = 0.1
    g.gain.value = (draft || S.settings).outVol
    g.connect(lim)
    lim.connect(AC.destination)
    OUT = g
  }
  return OUT
}
const setOutVol = v => { if (OUT) OUT.gain.value = v }

// Ses eşiği (noise gate) ses iş parçacığında çalışır; sekme arka plandayken zamanlayıcı kısıtlamasından etkilenmez.
// Sesi 30 ms geriden çalar, böylece eşiği aşan konuşmanın ilk hecesi kesilmez.
const GATE_WORKLET = `
class SalonGate extends AudioWorkletProcessor {
  constructor() {
    super()
    this.on = false
    this.thresh = 0.003
    this.env = 0
    this.hold = 0
    this.gain = 1
    this.open = true
    this.size = Math.ceil(sampleRate * 0.03)
    this.buf = new Float32Array(this.size)
    this.pos = 0
    this.ka = 1 - Math.exp(-1 / (0.005 * sampleRate))
    this.kr = 1 - Math.exp(-1 / (0.04 * sampleRate))
    this.since = 0
    this.port.onmessage = e => { this.on = !!e.data.on; this.thresh = Number(e.data.thresh) || 0 }
  }
  process(inputs, outputs) {
    const inp = inputs[0] && inputs[0][0]
    const out = outputs[0] && outputs[0][0]
    if (!out) return true
    const len = out.length
    let sum = 0
    if (inp) for (let i = 0; i < len; i++) sum += inp[i] * inp[i]
    const rms = Math.sqrt(sum / len)
    this.env = rms > this.env ? rms : this.env * 0.97
    if (this.on && this.env > this.thresh) this.hold = currentTime + 0.3
    this.open = !this.on || currentTime < this.hold
    const target = this.open ? 1 : 0
    const k = this.open ? this.ka : this.kr
    for (let i = 0; i < len; i++) {
      const x = inp ? inp[i] : 0
      const d = this.buf[this.pos]
      this.buf[this.pos] = x
      this.pos = (this.pos + 1) % this.size
      this.gain += (target - this.gain) * k
      out[i] = d * this.gain
    }
    this.since += len
    if (this.since >= sampleRate * 0.04) {
      this.since = 0
      this.port.postMessage({ env: this.env, open: this.open })
    }
    return true
  }
}
registerProcessor('salon-gate', SalonGate)
`

let gateReady = null
function loadGate() {
  if (!gateReady) {
    if (!AC.audioWorklet) return Promise.reject(new Error('AudioWorklet yok'))
    const url = URL.createObjectURL(new Blob([GATE_WORKLET], { type: 'text/javascript' }))
    gateReady = AC.audioWorklet.addModule(url).catch(e => { gateReady = null; throw e })
  }
  return gateReady
}

async function getMic(cfg = S.settings) {
  const base = { echoCancellation: true, noiseSuppression: cfg.ns !== false, autoGainControl: true }
  if (cfg.mic) {
    try { return await navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId: { exact: cfg.mic } } }) } catch { /* cihaz yok, varsayılana dön */ }
  }
  return navigator.mediaDevices.getUserMedia({ audio: base })
}

// Mikrofon zinciri: ham mikrofon -> seviye -> ses eşiği -> gönderilecek akış.
// cfg() her çağrıldığında güncel ayarları döndürür (seviye ve eşik canlı değişebilsin diye).
// Ses eşiği yüklenemezse (eski tarayıcı) zincir eşiksiz çalışır.
async function buildMicChain(raw, cfg) {
  const src = AC.createMediaStreamSource(raw)
  const gain = AC.createGain()
  const dest = AC.createMediaStreamDestination()
  let node = null
  try {
    await loadGate()
    node = new AudioWorkletNode(AC, 'salon-gate', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1] })
  } catch (e) { console.warn('ses eşiği kullanılamıyor', e) }

  const chain = { stream: dest.stream, out: node || gain, db: -100, open: true }
  let last = ''
  const push = () => {
    const c = cfg()
    gain.gain.value = c.micVol
    if (!node) return
    const key = c.gate + '|' + c.thresh
    if (key === last) return
    last = key
    node.port.postMessage({ on: !!c.gate, thresh: Math.pow(10, c.thresh / 20) })
  }
  push()
  const timer = setInterval(push, 100)
  src.connect(gain)
  if (node) {
    node.port.onmessage = e => { chain.db = 20 * Math.log10(e.data.env + 1e-9); chain.open = e.data.open }
    gain.connect(node)
    node.connect(dest)
  } else gain.connect(dest)

  chain.stop = () => {
    clearInterval(timer)
    try { src.disconnect(); gain.disconnect(); node?.disconnect() } catch { /* yoksay */ }
    if (node) node.port.onmessage = null
    raw.getTracks().forEach(t => t.stop())
    dest.stream.getTracks().forEach(t => t.stop())
  }
  return chain
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

// Kişi başı ses seviyesi 0-2 (%0-%200) arasındadır ve tarayıcıda saklanır. "Benim için sustur" da kişiye özeldir.
const userVol = name => { const v = Number(LS.get('vol.' + name, 1)); return Number.isFinite(v) ? Math.min(2, Math.max(0, v)) : 1 }
const userMuted = name => LS.get('mute.' + name, false) === true

function refreshRemoteAudio(id) {
  const r = S.voice?.remotes.get(id)
  if (!r) return
  const name = S.peers.get(id)?.name || ''
  const silent = S.me.deaf || S.srvMuted.has(id) || userMuted(name)
  r.gain.gain.value = silent ? 0 : userVol(name)
}
function refreshAllRemoteAudio() { if (S.voice) for (const id of S.voice.remotes.keys()) refreshRemoteAudio(id) }

function teardownRemote(r) {
  r.audio.pause()
  r.audio.srcObject = null
  try { r.src.disconnect(); r.gain.disconnect() } catch { /* yoksay */ }
}

function attachRemote(id, stream) {
  const v = S.voice
  if (!v) return
  detachRemote(id)
  ensureAudio()
  // Chrome, uzak bir akışı bir medya öğesine bağlanmadıkça Web Audio'ya vermez. Öğe sessizde tutulur,
  // ses Web Audio üzerinden (kişi seviyesi, hoparlör seviyesi) çalınır; %100 üstü ancak böyle mümkün.
  const audio = new Audio()
  audio.muted = true
  audio.srcObject = stream
  audio.play().catch(() => { /* sessiz öğe, sorun değil */ })
  const src = AC.createMediaStreamSource(stream)
  const gain = AC.createGain()
  src.connect(gain)
  gain.connect(getOut())
  v.remotes.set(id, { audio, stream, src, gain })
  addMeter(stream, id)
  refreshRemoteAudio(id)
  renderChannels()
}
function detachRemote(id) {
  const r = S.voice?.remotes.get(id)
  if (!r) return
  teardownRemote(r)
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
    let raw
    try { raw = await getMic() } catch (e) { return toast(micError(e), 'err') }
    const chain = await buildMicChain(raw, () => S.settings)
    const stream = chain.stream

    const room = T.joinRoom(S.cfg, 'voice-' + chId, { onJoinError: () => joinProblem() })
    const v = { ch: chId, room, stream, chain, remotes: new Map(), waiting: new Map() }
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
  stopShare(true) // kanaldan ayrılan kişinin paylaşımı ve izlemesi de biter
  closeWatch()
  S.voice = null
  for (const id of [...v.remotes.keys()]) {
    teardownRemote(v.remotes.get(id))
    dropMeter(id)
  }
  dropMeter(S.id)
  v.chain.stop()
  try { v.room.leave() } catch { /* yoksay */ }
  S.me.ch = null
  broadcastPresence()
  if (!quiet) tone('leave')
  renderAll()
}

function afterSelfChange() {
  refreshMic()
  refreshAllRemoteAudio()
  refreshStageAudio()
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
/* Ekran paylaşımı                                                     */
/* ------------------------------------------------------------------ */
// Bir ses kanalında aynı anda tek kişi paylaşır; kimin paylaştığı presence ile duyurulur (sh alanı).
// Paylaşan, ses odasından ayrı bir 'screen-<kanal>' odasına girer ve videoyu yalnızca o odaya "İzle" diyerek
// girenlere gönderir. Kimse izlemiyorsa hiç yükleme yapılmaz, ses bağlantıları da bundan etkilenmez.
// Ağ doğrudan (kişiden kişiye) olduğu için paylaşanın yüklemesi izleyen sayısı kadar artar.

const SHARE_Q = {
  '1080p60': { label: '1080p 60 fps', w: 1920, h: 1080, fps: 60, kbps: 8000, hint: 'detail' },
  '720p60': { label: '720p 60 fps', w: 1280, h: 720, fps: 60, kbps: 4500, hint: 'detail' },
  '1080p30': { label: '1080p 30 fps', w: 1920, h: 1080, fps: 30, kbps: 5000, hint: 'detail' },
  '720p30': { label: '720p 30 fps', w: 1280, h: 720, fps: 30, kbps: 2500, hint: 'detail' }
}
const isShareQ = k => typeof k === 'string' && Object.hasOwn(SHARE_Q, k)
const sharerIn = ch => roster().find(p => p.ch === ch && p.share) || null

let stageVol = (() => { const n = Number(LS.get('stageVol', 1)); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1 })()
let stageMuted = false
const IDLE_SHARE_MS = 15 * 60 * 1000 // izleyen yokken paylaşım en fazla bu kadar açık kalır

// Gönderici ayarı: en yüksek bit hızı, kare hızı ve gerekirse çözünürlük küçültme. Tarayıcı bağlantı yetmezse
// bunun altına kendisi iner; bu ayar yalnızca tavandır.
async function tuneSender(id) {
  const sh = S.share
  if (!sh || !sh.viewers.has(id)) return false
  const peers = sh.room.getPeers?.()
  const pc = peers instanceof Map ? peers.get(id) : peers?.[id]
  const senders = pc?.getSenders?.() || []
  const sender = senders.find(s => s.track === sh.track) || senders.find(s => s.track?.id === sh.track.id)
  if (!sender) return false
  const q = SHARE_Q[sh.q]
  const params = sender.getParameters()
  if (!params.encodings?.length) params.encodings = [{}]
  // Bant genişliği ya da CPU yetmediğinde çözünürlük yerine kare hızı düşsün (ekran yazıları okunaklı kalır).
  // Her tarayıcı bu alanı desteklemez; desteklemeyende contentHint = 'detail' aynı yönde çalışır.
  params.degradationPreference = 'maintain-resolution'
  const enc = params.encodings[0]
  enc.maxBitrate = q.kbps * 1000
  enc.maxFramerate = q.fps
  const w = sh.track.getSettings?.().width || 0
  enc.scaleResolutionDownBy = w > q.w ? Math.round((w / q.w) * 100) / 100 : 1
  await sender.setParameters(params)
  return true
}
// İzleyici sayısına göre kalite önerisi. Her izleyiciye ayrı kodlama ve yükleme yapıldığı için toplam yükleme
// (bit hızı x izleyici) bu bütçeyi aşmasın diye en yüksek uygun profil önerilir.
const SHARE_BUDGET_KBPS = 12000
const SHARE_ORDER = ['1080p60', '1080p30', '720p60', '720p30'] // bit hızına göre azalan
const recommendQ = n => SHARE_ORDER.find(k => SHARE_Q[k].kbps * Math.max(1, n) <= SHARE_BUDGET_KBPS) || '720p30'

function suggestQuality(sh) {
  const n = sh.viewers.size
  if (n < 2 || sh.suggestedFor === n) return
  const rec = recommendQ(n)
  if (SHARE_Q[rec].kbps >= SHARE_Q[sh.q].kbps) return // zaten uygun ya da daha düşük
  sh.suggestedFor = n
  toast(n + ' kişi izliyor. Yayın takılıyor ya da bulanıklaşıyorsa kaliteyi "' + SHARE_Q[rec].label + '" yap (paylaşım penceresinden).')
}

// Bağlantı kurulurken gönderici henüz hazır olmayabilir, bu yüzden birkaç kez denenir
const tuneSoon = id => { for (const ms of [300, 1500, 4000]) setTimeout(() => tuneSender(id).catch(e => console.warn('gönderici ayarı', e)), ms) }

async function startShare() {
  const v = S.voice
  if (!v || S.share) return
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Bu tarayıcı ekran paylaşımını desteklemiyor (telefon tarayıcılarının çoğu desteklemez).', 'err')
  const q = isShareQ($('#shareQ').value) ? $('#shareQ').value : '720p60'
  const wantAudio = $('#shareAudio').checked
  LS.set('shareQ', q)
  LS.set('shareAudio', wantAudio)
  const p = SHARE_Q[q]

  let stream
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: p.w }, height: { ideal: p.h }, frameRate: { ideal: p.fps, max: p.fps } },
      // suppressLocalAudioPlayback bilerek false: true olursa paylaşılan sekmenin sesi paylaşan kişide de kısılır
      audio: wantAudio ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false } : false
    })
  } catch (e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') return // seçim penceresi kapatıldı
    return toast('Ekran yakalanamadı: ' + (e?.message || e), 'err')
  }
  const track = stream.getVideoTracks()[0]
  // seçim penceresi açıkken ses kanalından çıkılmış olabilir
  if (!track || S.voice !== v || S.share) {
    stream.getTracks().forEach(t => t.stop())
    return
  }
  // kanalda başka biri paylaşıyorsa onun yayını kapanır (devralma)
  const current = sharerIn(v.ch)
  const takeover = current && !current.self ? current.id : ''
  if (wantAudio && !stream.getAudioTracks().length) {
    toast('Seçtiğin kaynakta ses paylaşımı yok. Ses için Chrome ya da Edge\'de tüm ekranı veya bir sekmeyi seçip "ses paylaş" kutusunu işaretle.', 'err')
  }
  track.contentHint = p.hint

  let room
  try { room = T.joinRoom(S.cfg, 'screen-' + v.ch, { onJoinError: () => joinProblem() }) } catch (e) {
    console.warn(e)
    stream.getTracks().forEach(t => t.stop())
    return toast('Paylaşım odası açılamadı. Birkaç saniye sonra tekrar dene.', 'err')
  }
  const sh = { stream, track, room, q, takeover, viewers: new Set(), emptySince: Date.now(), warned: false, idle: 0, suggestedFor: 0 }
  S.share = sh
  track.addEventListener('ended', () => { if (S.share === sh) stopShare() }) // tarayıcının kendi "paylaşımı durdur" düğmesi
  room.onPeerJoin = id => {
    if (S.share !== sh) return
    room.addStream(stream, { target: id, metadata: { t: 'screen' } })
    sh.viewers.add(id)
    sh.emptySince = 0
    sh.warned = false
    tuneSoon(id)
    suggestQuality(sh)
    renderAll()
  }
  room.onPeerLeave = id => {
    sh.viewers.delete(id)
    if (!sh.viewers.size) { sh.emptySince = Date.now(); sh.warned = false }
    renderAll()
  }
  // izleyen yoksa paylaşım IDLE_SHARE_MS sonra kendiliğinden kapanır (bir dakika önceden uyarılır)
  sh.idle = setInterval(() => {
    if (S.share !== sh || sh.viewers.size || !sh.emptySince) return
    const idle = Date.now() - sh.emptySince
    if (idle >= IDLE_SHARE_MS) {
      stopShare(true)
      toast('Kimse izlemediği için ekran paylaşımı ' + Math.round(IDLE_SHARE_MS / 60000) + ' dakika sonra otomatik kapandı.')
    } else if (idle >= IDLE_SHARE_MS - 60000 && !sh.warned) {
      sh.warned = true
      toast('Kimse izlemiyor, ekran paylaşımı 1 dakika içinde otomatik kapanacak.')
    }
  }, 15000)
  broadcastPresence()
  renderAll()
  toast(takeover ? 'Ekran paylaşımı başladı. ' + current.name + ' kullanıcısının yayını kapandı.' : 'Ekran paylaşımı başladı. Kanaldakiler "İzle"ye bastıkça yayın onlara gider.')
}

function stopShare(quiet) {
  const sh = S.share
  if (!sh) return
  S.share = null
  clearInterval(sh.idle)
  if (S.watch?.self) closeWatch() // kendi yayınının önizlemesi de kapanır
  try { sh.room.leave() } catch { /* yoksay */ }
  sh.stream.getTracks().forEach(t => t.stop())
  broadcastPresence()
  if (!quiet) toast('Ekran paylaşımı durdu.')
  renderAll()
}

// Paylaşım sürerken kaliteyi değiştirir
async function changeShareQuality(q) {
  const sh = S.share
  if (!sh || !isShareQ(q)) return
  const p = SHARE_Q[q]
  sh.q = q
  LS.set('shareQ', q)
  sh.track.contentHint = p.hint
  try {
    await sh.track.applyConstraints({ width: { ideal: p.w }, height: { ideal: p.h }, frameRate: { ideal: p.fps, max: p.fps } })
  } catch (e) { console.warn('yakalama kalitesi değiştirilemedi', e) }
  for (const id of sh.viewers) tuneSender(id).catch(e => console.warn('gönderici ayarı', e))
  broadcastPresence()
  renderAll()
}

function updateShareEst() {
  const q = SHARE_Q[$('#shareQ').value] || SHARE_Q['720p60']
  const per = q.kbps / 1000
  $('#shareEst').textContent = 'Her izleyici için yaklaşık ' + per + ' Mbps yükleme gerekir (3 kişi izlerse ~' + per * 3 + ' Mbps). Bağlantın ya da bilgisayarın yetmezse akış kendiliğinden kalite düşürür; takılırsa kaliteyi azalt. Öneri: 1 izleyici 1080p 60 fps, 2 izleyici 1080p 30 fps, 3 ve üzeri 720p 30 fps.'
}

function openShareDlg() {
  if (!S.voice) return
  const sharing = !!S.share
  const cur = !sharing ? sharerIn(S.voice.ch) : null
  const takeover = !!cur && !cur.self
  $('#shareWarn').hidden = !takeover
  if (takeover) $('#shareWarn').textContent = cur.name + ' şu an ekran paylaşıyor. Başlatırsan onun yayını kapanır.'
  $('#shareStart').textContent = takeover ? 'Devral ve paylaş' : 'Paylaşmaya başla'
  $('#shareTitle').textContent = sharing ? 'Ekran paylaşımı' : 'Ekran paylaş'
  const saved = LS.get('shareQ', '720p60')
  $('#shareQ').value = sharing ? S.share.q : (isShareQ(saved) ? saved : '720p60')
  $('#shareAudio').checked = sharing ? S.share.stream.getAudioTracks().length > 0 : LS.get('shareAudio', false) === true
  $('#shareAudio').disabled = sharing
  $('#shareCancel').hidden = sharing
  $('#shareStart').hidden = sharing
  $('#shareStop').hidden = !sharing
  $('#shareDone').hidden = !sharing
  updateShareEst()
  $('#shareDlg').showModal()
}

/* ---- İzleme ---- */

function refreshStageAudio() {
  const v = $('#stageVideo')
  const muted = S.me.deaf || stageMuted || !!S.watch?.self // kendi yayınını izlerken ses kapalı (zaten kaynağı duyuyorsun)
  v.volume = stageVol
  v.muted = muted
  $('#stageMute').innerHTML = ico(muted ? 'speakerOff' : 'speaker')
  $('#stageMute').setAttribute('aria-pressed', String(muted))
  $('#stageVol').value = Math.round(stageVol * 100)
}

function updateStageInfo() {
  const w = S.watch
  if (!w) return
  const v = $('#stageVideo')
  const q = w.self ? S.share?.q : S.peers.get(w.id)?.share
  const parts = []
  if (v.videoWidth) parts.push(v.videoWidth + '×' + v.videoHeight)
  if (w.fps) parts.push(w.fps + ' fps')
  if (isShareQ(q)) parts.push('hedef ' + SHARE_Q[q].label)
  $('#stageInfo').textContent = parts.join(' · ')
}

// Karelerin gerçekte kaç fps geldiğini ölçer (desteklenmeyen tarayıcıda gösterilmez)
function trackFps(video, cb) {
  if (!video.requestVideoFrameCallback) return () => {}
  let alive = true
  let n = 0
  let t0 = performance.now()
  const tick = () => {
    if (!alive) return
    n++
    const now = performance.now()
    if (now - t0 >= 1000) { cb(Math.round((n * 1000) / (now - t0))); n = 0; t0 = now }
    video.requestVideoFrameCallback(tick)
  }
  video.requestVideoFrameCallback(tick)
  return () => { alive = false }
}

function openWatch(id) {
  const v = S.voice
  const p = S.peers.get(id)
  if (!v || !p?.ready || !p.share || p.ch !== v.ch) return
  if (S.watch?.id === id) { $('#stage').classList.remove('mini'); return }
  closeWatch()
  let room
  try { room = T.joinRoom(S.cfg, 'screen-' + v.ch, { onJoinError: () => joinProblem() }) } catch (e) {
    console.warn(e)
    return toast('Yayına bağlanılamadı. Birkaç saniye sonra tekrar dene.', 'err')
  }
  const w = { id, ch: v.ch, room, stream: null, fps: 0, stopFps: null, timer: 0 }
  S.watch = w
  // yalnızca presence'ta paylaşıyor görünen kişinin görüntüsü kabul edilir
  room.onPeerStream = (st, pid) => {
    if (S.watch !== w || pid !== w.id || !S.peers.get(pid)?.share || !st.getVideoTracks().length) return
    showStream(w, st)
  }
  room.onPeerLeave = pid => {
    if (S.watch === w && pid === w.id) { closeWatch(); toast(p.name + ' paylaşımı bitirdi.') }
  }
  w.timer = setTimeout(() => {
    if (S.watch === w && !w.stream) $('#stageWait').textContent = 'Bağlanılamadı. Paylaşan kişinin ağı doğrudan bağlantıya izin vermiyor olabilir.'
  }, 20000)

  const stage = $('#stage')
  stage.hidden = false
  stage.classList.remove('mini')
  $('#stageTitle').textContent = p.name + ' ekranını paylaşıyor'
  $('#stageInfo').textContent = ''
  $('#stageWait').hidden = false
  $('#stageWait').textContent = 'Bağlanıyor…'
  $('#stageAudio').hidden = true
  closeDrawers()
  renderAll()
}

// Paylaşan kişi kendi yayınını yerel olarak önizler: ağdan geçmez, ek yükleme yapmaz.
// Gösterilen, yakalanan görüntüdür; izleyenler sıkıştırılmış halini görür.
function openSelfWatch() {
  const sh = S.share
  const v = S.voice
  if (!sh || !v) return
  if (S.watch?.self) { $('#stage').classList.remove('mini'); return }
  closeWatch()
  const w = { id: S.id, self: true, ch: v.ch, room: null, stream: sh.stream, fps: 0, stopFps: null, timer: 0 }
  S.watch = w
  const stage = $('#stage')
  stage.hidden = false
  stage.classList.remove('mini')
  $('#stageTitle').textContent = 'Senin yayının (önizleme)'
  $('#stageInfo').textContent = ''
  $('#stageWait').hidden = true
  showStream(w, sh.stream)
  closeDrawers()
  renderAll()
}

function showStream(w, st) {
  w.stream = st
  clearTimeout(w.timer)
  const video = $('#stageVideo')
  video.srcObject = st
  $('#stageWait').hidden = true
  $('#stageAudio').hidden = !!w.self || !st.getAudioTracks().length
  refreshStageAudio()
  video.play().catch(() => {
    stageMuted = true // tarayıcı sesli otomatik oynatmayı engelledi
    refreshStageAudio()
    video.play().catch(() => {})
    toast('Tarayıcı sesi engelledi. Sesi açmak için hoparlör düğmesine bas.', 'err')
  })
  w.stopFps?.()
  w.stopFps = trackFps(video, fps => { w.fps = fps; updateStageInfo() })
  updateStageInfo()
}

function closeWatch() {
  const w = S.watch
  if (!w) return
  S.watch = null
  clearTimeout(w.timer)
  w.stopFps?.()
  const video = $('#stageVideo')
  video.pause()
  video.srcObject = null
  try { w.room?.leave() } catch { /* yoksay */ }
  const stage = $('#stage')
  stage.hidden = true
  stage.classList.remove('mini')
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  renderAll()
}

function toggleFullscreen() {
  const stage = $('#stage')
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return }
  stage.classList.remove('mini')
  const r = stage.requestFullscreen?.()
  if (r?.catch) r.catch(() => toast('Tam ekran açılamadı.', 'err'))
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
  const el = h('span', { class: 'avatar ' + cls, 'data-uid': uid })
  paintAvatar(el, name)
  return el
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
      class: 'chan' + (S.voice?.ch === c.id ? ' live' : ''),
      onclick: () => { joinVoice(c.id); closeDrawers() } // sesli kanalda metin yok: görünen metin kanalı değişmez
    }, h('span', { html: ico('speaker'), style: 'display:contents' }), h('span', { class: 'name', text: c.name }),
    inside.length ? h('span', { class: 'count', text: inside.length + '/' + (CONFIG.maxPerVoice ?? 8) }) : null))
    if (inside.length) {
      li.append(h('ul', { class: 'vlist' }, inside.map(p => {
        const pending = S.voice?.ch === c.id && !p.self && !S.voice.remotes.has(p.id)
        const muted = p.muted || S.srvMuted.has(p.id)
        return h('li', {}, h('button', { class: 'vuser' + (pending ? ' pending' : ''), onclick: () => openUser(p.id) },
          avatar(p.name, p.self ? 'me' : p.id, 'small'),
          h('span', { class: 'nm', text: p.name }),
          p.share ? h('span', { class: 'live-pill', text: 'CANLI', title: 'Ekran paylaşıyor' }) : null,
          (muted || p.deaf) ? h('span', { class: 'st', html: ico(p.deaf ? 'headphonesOff' : 'micOff'), title: p.deaf ? 'Sesi kapalı' : 'Mikrofonu kapalı' }) : null,
          (!p.self && userMuted(p.name)) ? h('span', { class: 'st', html: ico('speakerOff'), title: 'Senin için susturuldu' }) : null))
      })))
    }
    vl.append(li)
  }
}

function renderMembers() {
  const people = roster()
  $('#memberTitle').textContent = 'Çevrimiçi (' + people.length + ')'
  $('#emptyHint').hidden = people.length > 1 || S.dir.size > 2 // 2'den fazla kayıtlı kullanıcı varsa ipucu gösterilmez
  const ul = $('#memberList')
  ul.textContent = ''
  for (const p of people) {
    // data-uid verilmez: konuşma halkası burada değil, yalnızca soldaki kanal listesinde görünür
    ul.append(h('li', {}, h('button', { class: 'member', onclick: () => openUser(p.id) },
      avatar(p.name, null, 'ring on'),
      h('span', { class: 'meta' },
        h('strong', {}, p.name),
        S.adminIds.has(p.id) ? h('span', { class: 'm-tag' }, h('span', { class: 'badge', text: 'Yönetici' })) : null,
        p.ch ? h('small', { text: 'Sesli: ' + chanName(p.ch) + (p.share ? ' · Ekran paylaşıyor' : '') }) : null))))
  }

  // Kayıtlı ama şu an bağlı olmayan hesaplar (hesap dizininden) kalıcı olarak çevrimdışı görünür
  const online = new Set(people.map(p => keyName(p.name)))
  const offline = [...S.dir.values()]
    .filter(e => !online.has(keyName(e.name)))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  if (!offline.length) return
  ul.append(h('li', { class: 'm-sec', text: 'Çevrimdışı (' + offline.length + ')' }))
  for (const e of offline) {
    ul.append(h('li', {}, h('div', { class: 'member off' },
      avatar(e.name, null, 'ring'),
      h('span', { class: 'meta' },
        h('strong', {}, e.name),
        e.admin ? h('span', { class: 'm-tag' }, h('span', { class: 'badge', text: 'Yönetici' })) : null))))
  }
}

function renderMe() {
  const muted = S.me.muted || S.srvMuted.has(S.id)
  const state = S.srvMuted.has(S.id) ? 'Yönetici seni susturdu' : isAdmin() ? 'Yönetici' : S.voice ? 'Ses: ' + chanName(S.voice.ch) : 'Çevrimiçi'
  const av = $('#meAvatar')
  paintAvatar(av, S.name)
  $('#meName').textContent = S.name
  $('#meBtn').title = S.name + ' · ' + state
  $('#profName').textContent = S.name
  $('#profState').textContent = state
  const pav = $('#profAvatar')
  paintAvatar(pav, S.name)
  $('#avatarDel').hidden = !avatarUrl(S.name)
  const mic = $('#micBtn')
  mic.innerHTML = ico(muted ? 'micOff' : 'mic')
  mic.setAttribute('aria-pressed', String(muted))
  mic.setAttribute('aria-label', muted ? 'Mikrofonu aç' : 'Mikrofonu kapat')
  const deaf = $('#deafBtn')
  deaf.innerHTML = ico(S.me.deaf ? 'headphonesOff' : 'headphones')
  deaf.setAttribute('aria-pressed', String(S.me.deaf))
  deaf.setAttribute('aria-label', S.me.deaf ? 'Sesi aç' : 'Sesi kapat')

  // ekran paylaş: ayarların yanındaki simge; ses kanalında değilken kapalı, paylaşırken kırmızı
  const sb = $('#shareBtn')
  sb.hidden = !navigator.mediaDevices?.getDisplayMedia
  sb.disabled = !S.voice
  sb.setAttribute('aria-pressed', String(!!S.share))
  const label = S.share ? 'Ekran paylaşımını yönet' : S.voice ? 'Ekran paylaş' : 'Ekran paylaşmak için önce bir ses kanalına katıl'
  sb.title = label
  sb.setAttribute('aria-label', label)
}

function renderVoiceBar() {
  const bar = $('#voiceBar')
  bar.hidden = !S.voice
  if (!S.voice) return
  const people = roster()
  const n = people.filter(p => p.ch === S.voice.ch).length
  $('#vbTitle').textContent = 'Ses bağlı'
  $('#vbSub').textContent = chanName(S.voice.ch) + ', ' + n + ' kişi'

  // ekran paylaşımı: paylaşan kendi yayınını önizler, diğerleri izler
  const sharer = people.find(p => p.ch === S.voice.ch && p.share && !p.self) || null
  const wb = $('#watchBtn')
  wb.hidden = !S.share && !sharer
  if (S.share) wb.textContent = S.watch?.self ? 'Önizlemeyi aç' : 'Yayınımı izle'
  else if (sharer) wb.textContent = S.watch?.id === sharer.id ? 'Yayını aç' : 'İzle: ' + sharer.name
  $('#voiceBar .vb-actions').hidden = wb.hidden
  const info = $('#shareInfo')
  info.hidden = !S.share
  if (S.share) {
    const k = S.share.viewers.size
    const mbps = (SHARE_Q[S.share.q].kbps * k) / 1000
    info.textContent = 'Ekranını paylaşıyorsun (' + SHARE_Q[S.share.q].label + ') · ' + k + ' izleyen' + (k ? ' · ~' + mbps.toFixed(1) + ' Mbps yükleme' : '')
  }
}

function renderHeader() {
  const locked = adminOnly.has(S.view) && !isAdmin()
  $('#chIcon').innerHTML = ico('hash')
  $('#chTitle').textContent = chanName(S.view) || ''
  $('#chSub').textContent = adminOnly.has(S.view) ? 'Duyuru kanalı, sadece yöneticiler yazabilir' : 'Metin kanalı'
  const input = $('#msgInput')
  input.disabled = locked
  input.placeholder = locked ? 'Bu kanala sadece yöneticiler yazabilir' : chanName(S.view) + ' kanalına yaz'
  $('#composer .send').disabled = locked
  $('#attachBtn').disabled = locked
  $('#composer').classList.toggle('locked', locked)
}

function viewChannel(id) {
  S.view = id
  S.unread.delete(id)
  renderMessages({ stick: true })
  renderAll()
  closeDrawers()
  if (!matchMedia('(max-width: 780px)').matches) $('#msgInput').focus() // style.css'teki mobil sınırla aynı olmalı
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
  paintAvatar(av, p.name)
  av.dataset.uid = p.self ? 'me' : id
  $('#udName').textContent = p.name + (S.adminIds.has(id) ? ' (yönetici)' : '')
  $('#udInfo').textContent = p.ch ? 'Ses kanalında: ' + chanName(p.ch) : 'Çevrimiçi'

  const canVol = !p.self && S.voice && p.ch === S.voice.ch
  $('#udVolume').hidden = !canVol
  if (canVol) {
    const v = Math.round(userVol(p.name) * 100)
    $('#udVol').value = v
    $('#udVolOut').textContent = v + '%'
    paintLocalMute(p.name)
  }
  const adm = isAdmin() && !p.self
  $('#udAdmin').hidden = !adm
  if (adm) {
    $('#udMute').textContent = S.srvMuted.has(id) ? 'Susturmayı kaldır' : 'Sustur'
    $('#udKick').disabled = !p.ch
  }
  dlg.showModal()
}

function paintLocalMute(name) {
  const m = userMuted(name)
  const b = $('#udLocalMute')
  b.innerHTML = ico(m ? 'speakerOff' : 'speaker')
  b.setAttribute('aria-pressed', String(m))
  const label = m ? 'Susturmayı kaldır' : 'Benim için sustur'
  b.setAttribute('aria-label', label)
  b.title = label
}

let draft = null // ayarlar penceresi açıkken değişiklikler burada durur, Kaydet'e basılınca S.settings'e geçer
let test = null // "Kendimi dinle" testi

const lvlPct = db => Math.max(0, Math.min(100, ((db + 70) / 60) * 100))

function updateTestBtn() {
  const b = $('#testBtn')
  b.textContent = test ? (test.chain ? 'Dinlemeyi durdur' : 'Başlatılıyor…') : 'Kendimi dinle'
  b.setAttribute('aria-pressed', String(!!test))
}

function paintLevel() {
  const c = test?.chain
  const fill = $('#lvlFill')
  fill.style.width = (c ? lvlPct(c.db) : 0) + '%'
  fill.classList.toggle('open', !!c?.open)
}

function syncAudioControls() {
  const d = draft
  $('#setMicVol').value = Math.round(d.micVol * 100)
  $('#setMicVolOut').textContent = Math.round(d.micVol * 100) + '%'
  $('#setOutVol').value = Math.round(d.outVol * 100)
  $('#setOutVolOut').textContent = Math.round(d.outVol * 100) + '%'
  $('#setNs').checked = d.ns
  $('#setGate').checked = d.gate
  $('#threshField').hidden = !d.gate
  $('#setThresh').value = d.thresh
  $('#setThreshOut').textContent = d.thresh + ' dB'
  const mark = $('#lvlMark')
  mark.hidden = !d.gate
  mark.style.left = lvlPct(d.thresh) + '%'
  $('#setSounds').checked = d.sounds
  updateTestBtn()
}

async function startTest() {
  if (test || !draft) return
  if (!navigator.mediaDevices?.getUserMedia) return toast('Bu tarayıcıda ya da bu adreste mikrofon kullanılamıyor. Sayfa https ile açılmalı.', 'err')
  const tok = {}
  test = tok
  updateTestBtn()
  ensureAudio()
  let raw
  try { raw = await getMic(draft) } catch (e) { if (test === tok) test = null; updateTestBtn(); return toast(micError(e), 'err') }
  const chain = await buildMicChain(raw, () => draft || S.settings)
  if (test !== tok) { chain.stop(); return } // pencere kapandı ya da test iptal edildi
  chain.out.connect(getOut())
  tok.chain = chain
  tok.timer = setInterval(paintLevel, 50)
  updateTestBtn()
  fillMics() // izin verildi, cihaz adları artık görünür
}

function stopTest() {
  const t = test
  test = null
  if (!t) return
  clearInterval(t.timer)
  t.chain?.stop()
  paintLevel()
  updateTestBtn()
}

function restartTest() {
  stopTest()
  startTest()
}

async function openSettings() {
  const s = S.settings
  draft = { sounds: s.sounds, mic: s.mic, micVol: s.micVol, outVol: s.outVol, ns: s.ns, gate: s.gate, thresh: s.thresh }
  $('#invField').hidden = !isAdmin()
  syncAudioControls()
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
  const want = (draft || S.settings).mic
  sel.value = want
  if (sel.value !== want) sel.value = ''
}

function saveSettings() {
  const d = draft
  if (!d) return
  // Mikrofon cihazı ya da gürültü engelleme değiştiyse mikrofon yeniden açılmalı; seviye ve eşik canlı uygulanır
  const reopen = d.mic !== S.settings.mic || d.ns !== S.settings.ns
  Object.assign(S.settings, d)
  for (const k of ['sounds', 'mic', 'micVol', 'outVol', 'ns', 'gate', 'thresh']) LS.set(k, S.settings[k])
  setOutVol(S.settings.outVol)
  broadcastPresence()
  renderAll()
  if (reopen && S.voice) { const ch = S.voice.ch; leaveVoice(true); joinVoice(ch) }
}

/* ------------------------------------------------------------------ */
/* Kullanıcı adı değiştirme ve şifre sıfırlama                         */
/* ------------------------------------------------------------------ */

// Oturumu açık kullanıcı adını değiştirir. Diğer kişiler yeni adı hesap dizininden doğrular;
// dizin yenilenene kadar presence mesajı onPresence içinde birkaç saniye bekletilir.
// Şifre sorulmaz; 3 ayda 1 kez sınırını sunucu uygular (rename_cooldown).
async function renameAccount(newName) {
  const res = await rpc('salon_rename', { p_new: newName })
  if (!res?.ok) {
    if (res?.error === 'rename_cooldown') {
      const d = res.next ? new Date(res.next) : null
      const when = d && !isNaN(d) ? ' Bir sonraki değiştirme tarihi: ' + d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : ''
      throw new AuthError('Kullanıcı adını 3 ayda yalnızca 1 kez değiştirebilirsin.' + when)
    }
    throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
  }
  const prevAv = S.avatars.get(S.key)
  S.name = normName(res.me.username)
  S.key = keyName(S.name)
  if (prevAv) S.avatars.set(S.key, prevAv) // ad değişince fotoğraf anında kaybolmasın
  LS.set('name', S.name)
  broadcastPresence()
  dirAt = 0
  await refreshDir()
  renderAll()
}

// Oturumu açık kullanıcı şifresini değiştirir (mevcut şifre doğrulanır)
async function changePassword(oldPass, newPass) {
  const res = await rpc('salon_change_password', { p_old: oldPass, p_new: newPass })
  if (res?.ok) return
  if (res?.error === 'bad_credentials') throw new AuthError('Mevcut şifre yanlış.')
  throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
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
  await loadMessages({ first: true })

  lobby = T.joinRoom(S.cfg, 'lobby', { onJoinError: () => joinProblem() })
  A.presence = lobby.makeAction('presence')
  A.chat = lobby.makeAction('chat')
  A.mdel = lobby.makeAction('mdel')
  A.cmd = lobby.makeAction('cmd')
  A.avtr = lobby.makeAction('avtr')

  A.presence.onMessage = (d, { peerId }) => onPresence(d, peerId)
  A.chat.onMessage = (d, { peerId }) => {
    const p = S.peers.get(peerId)
    if (!p?.ready) return // kimliği doğrulanmamış kişinin mesajı alınmaz
    const m = cleanMsg(d, peerId, p.name)
    if (!m) return
    if (adminOnly.has(m.ch) && !S.adminIds.has(peerId)) return // duyuru kanalına yönetici dışı mesaj girmez
    addMessage(m)
  }
  // Silme bildirimi: yalnızca mesajın yazarı ya da bir yönetici gönderebilir (gerçek kontrol sunucudadır, bu sadece anlık görünüm)
  A.mdel.onMessage = (d, { peerId }) => {
    const p = S.peers.get(peerId)
    if (!p?.ready || !d || typeof d.id !== 'string') return
    const id = str(d.id, 64)
    const m = findMessage(id)
    if (m && (S.adminIds.has(peerId) || keyName(m.name) === keyName(p.name))) removeMessage(id)
  }
  A.cmd.onMessage = (d, { peerId }) => onCmd(d, peerId)
  // biri fotoğrafını değiştirdi: dizini (en fazla 1,5 sn'de bir) yenile, yeni fotoğraf oradan gelir
  A.avtr.onMessage = (d, { peerId }) => {
    if (!S.peers.get(peerId)?.ready || avPing) return
    avPing = setTimeout(() => { avPing = 0; dirAt = 0; refreshDir() }, 1500)
  }

  lobby.onPeerJoin = id => {
    if (!S.peers.has(id)) S.peers.set(id, { name: '', ch: null, muted: false, deaf: false, ready: false })
    A.presence.send(myPresence(), { target: id })
    // kimliğimiz karşıda doğrulanana kadar bekle, sonra geçmişi ve susturmaları gönder
    setTimeout(() => {
      if (!S.peers.has(id)) return
      if (isAdmin()) for (const t of S.srvMuted) sendCmd('mute', t, '', id)
    }, 1500)
    updateNet()
    renderAll()
  }
  lobby.onPeerLeave = id => {
    if (S.watch?.id === id) { closeWatch(); toast((S.peers.get(id)?.name || 'Paylaşan kişi') + ' ayrıldı, yayın bitti.') }
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
  setInterval(loadMessages, 30000) // kaçırılan mesajlar ve silmeler için
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadMessages() })
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
  $('#invite').hidden = true
  $('#app').hidden = false
  document.title = CONFIG.serverName || 'Salon'
  $('#serverName').textContent = CONFIG.serverName || 'Salon'
  $('#serverVer').textContent = CONFIG.version ? 'v' + CONFIG.version : ''
  renderHeader()
  renderMe()
}

// Giriş ve (gerekiyorsa) davet kodu sonrası ortak başlangıç
async function start(me) {
  setBusy(true, 'Odaya bağlanılıyor…')
  await boot(me)
  LS.set('name', S.name)
  showApp()
  startLoops()
  broadcastPresence()
  updateNet()
  renderAll()
  renderMessages()
}

// Hesabı açık ama henüz sunucuya girmemiş (üye olmayan) kullanıcı: davet kodu ekranı
function showInvite(username) {
  $('#login').hidden = true
  $('#invite').hidden = false
  $('#inviteHello').textContent = 'Merhaba ' + username + '. Sunucuya katılmak için yöneticiden aldığın davet kodunu yaz.'
  $('#inviteError').hidden = true
  $('#inviteCode').focus()
}

let redeeming = false
async function redeem(raw) {
  if (redeeming) return
  const err = $('#inviteError')
  const fail = msg => { err.hidden = false; err.textContent = msg }
  err.hidden = true
  const code = String(raw || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()
  if (code.length !== 8) return fail('Davet kodu 8 karakter olmalı.')
  redeeming = true
  $('#inviteSubmit').disabled = true
  try {
    await loadLibs()
    await ensureSession()
    const res = await rpc('salon_redeem_invite', { p_code: code })
    if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
    await start(res.me)
  } catch (e) {
    console.warn(e)
    teardown()
    fail(e instanceof AuthError ? e.message : 'Bağlanılamadı. Sayfayı yenileyip tekrar dene.')
  } finally {
    redeeming = false
    $('#inviteSubmit').disabled = false
  }
}

async function logout() {
  try { await rpc('salon_logout') } catch { /* yoksay */ }
  try { await sb.auth.signOut() } catch { /* yoksay */ }
  location.reload()
}

/* ---- Davet kodları (yönetici) ---- */

const fmtCode = c => c.slice(0, 4) + '-' + c.slice(4)
const fmtDate = ts => new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

function invError(msg) {
  const el = $('#invErr')
  el.hidden = !msg
  el.textContent = msg || ''
}

async function adminRpc(fn, args) {
  const res = await rpc(fn, args)
  if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
  return res
}

async function loadInvites() {
  invError('')
  let list
  try { list = (await adminRpc('salon_invites')).list } catch (e) {
    return invError(e instanceof AuthError ? e.message : 'Kodlar yüklenemedi.')
  }
  if (!Array.isArray(list)) list = []
  const ul = $('#invList')
  ul.textContent = ''
  $('#invEmpty').hidden = list.length > 0
  for (const i of list) {
    const code = str(i.code, 8)
    ul.append(h('li', { class: 'inv' + (i.used ? ' used' : '') },
      h('div', { class: 'info' },
        h('span', { class: 'code', text: fmtCode(code) }),
        h('small', { text: i.used ? 'Kullanan: ' + (i.by || 'silinmiş hesap') : fmtDate(i.ts) + ' tarihinde oluşturuldu' })),
      i.used ? null : h('button', {
        type: 'button', class: 'icon-btn', title: 'Kodu kopyala', 'aria-label': 'Kodu kopyala', html: ico('copy'),
        onclick: async () => { const ok = await copyText(fmtCode(code)); toast(ok ? 'Kod kopyalandı.' : 'Kopyalanamadı, kodu elle seçip kopyala.', ok ? '' : 'err') }
      }),
      h('button', {
        type: 'button', class: 'icon-btn danger', title: i.used ? 'Kaydı sil' : 'Kodu sil', 'aria-label': i.used ? 'Kaydı sil' : 'Kodu sil', html: ico('trash'),
        onclick: () => deleteInvite(i.id)
      })))
  }
}

let invBusy = false
async function newInvite() {
  if (invBusy) return
  invBusy = true
  $('#invNew').disabled = true
  invError('')
  try {
    const res = await adminRpc('salon_create_invite')
    const code = fmtCode(str(res.code, 8))
    const copied = await copyText(code)
    toast(copied ? 'Kod oluşturuldu ve kopyalandı: ' + code : 'Kod oluşturuldu: ' + code)
    await loadInvites()
  } catch (e) {
    invError(e instanceof AuthError ? e.message : 'Kod oluşturulamadı.')
  } finally {
    invBusy = false
    $('#invNew').disabled = false
  }
}

async function deleteInvite(id) {
  try {
    await adminRpc('salon_delete_invite', { p_id: id })
    await loadInvites()
  } catch (e) {
    invError(e instanceof AuthError ? e.message : 'Kod silinemedi.')
  }
}

function openInvites() {
  if (!isAdmin()) return
  $('#settingsDlg').close()
  $('#invDlg').showModal()
  loadInvites()
}

let entering = false
async function enter({ mode, name, password, auto }) {
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
        res = await rpc('salon_register', { p_username: name, p_password: password, p_pubkey: pk, p_seed: hex(seed) })
      } else {
        res = await rpc('salon_login', { p_username: name, p_password: password })
      }
      if (!res?.ok) throw new AuthError(ERR[res?.error] || 'İşlem başarısız oldu.')
      me = res.me
    }
    // Hesap var ama henüz sunucuya üye değil: davet kodu ekranı
    if (me.pending) {
      LS.set('name', normName(me.username))
      showInvite(normName(me.username))
      return
    }
    await start(me)
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
    if (mode === 'register' && password !== $('#pass2Input').value) return showLoginError('Şifreler aynı değil.')
    enter({ mode, name, password })
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
    $('#profileDlg').close()
    $('#renameErr').hidden = true
    $('#renameInput').value = S.name
    $('#renameDlg').showModal()
  })
  $('#renameCancel').addEventListener('click', () => $('#renameDlg').close())
  $('#renameForm').addEventListener('submit', async e => {
    e.preventDefault()
    const err = $('#renameErr')
    const fail = msg => { err.hidden = false; err.textContent = msg }
    err.hidden = true
    const name = normName($('#renameInput').value)
    if (name === S.name) return fail('Bu zaten şu anki kullanıcı adın.')
    if (!validNewName(name)) return fail(NEW_NAME_RULE)
    const btn = $('#renameSubmit')
    btn.disabled = true
    try {
      await renameAccount(name)
      $('#renameDlg').close()
      toast('Kullanıcı adın değişti.')
    } catch (x) {
      console.warn(x)
      fail(x instanceof AuthError ? x.message : 'İşlem başarısız oldu.')
    } finally {
      btn.disabled = false
    }
  })

  // şifre değiştirme
  $('#passBtn').addEventListener('click', () => {
    $('#profileDlg').close()
    $('#passForm').reset()
    $('#passErr').hidden = true
    $('#passDlg').showModal()
  })
  $('#passCancel').addEventListener('click', () => $('#passDlg').close())
  $('#passForm').addEventListener('submit', async e => {
    e.preventDefault()
    const err = $('#passErr')
    const fail = msg => { err.hidden = false; err.textContent = msg }
    err.hidden = true
    const oldPass = $('#passOld').value
    const newPass = $('#passNew').value
    if (!oldPass) return fail('Mevcut şifreni yaz.')
    if (newPass.length < 6 || newPass.length > 72) return fail(ERR.weak_password)
    if (newPass === oldPass) return fail('Yeni şifre mevcut şifreyle aynı olamaz.')
    if (newPass !== $('#passNew2').value) return fail('Yeni şifreler aynı değil.')
    const btn = $('#passSubmit')
    btn.disabled = true
    try {
      await changePassword(oldPass, newPass)
      $('#passDlg').close()
      $('#passForm').reset()
      toast('Şifren değişti.')
    } catch (x) {
      console.warn(x)
      fail(x instanceof AuthError ? x.message : 'İşlem başarısız oldu.')
    } finally {
      btn.disabled = false
    }
  })

  // mesaj gönderme: görsel varsa birlikte gider; gönderilemezse yazdığın ve görsel kaybolmaz
  let sending = false
  $('#composer').addEventListener('submit', async e => {
    e.preventDefault()
    if (sending || preparing) return
    const input = $('#msgInput')
    const text = input.value
    sending = true
    try {
      if (await sendMessage(text, pending)) {
        if (input.value === text) input.value = ''
        clearPending()
      }
    } finally {
      sending = false
    }
  })

  // görsel ekleme: düğme, yapıştırma (Ctrl+V) ve sürükle-bırak
  $('#attachBtn').addEventListener('click', () => $('#fileInput').click())
  $('#fileInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; setPending(f) })
  $('#attachClear').addEventListener('click', clearPending)
  $('#msgInput').addEventListener('paste', e => {
    const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); setPending(f) }
  })
  const main = $('.main')
  main.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault() })
  main.addEventListener('drop', e => {
    const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/'))
    if (!f) return
    e.preventDefault()
    setPending(f)
  })
  $('#messages').addEventListener('scroll', e => {
    const b = e.target
    b.dataset.stuck = b.scrollHeight - b.scrollTop - b.clientHeight < 90 ? '1' : '0'
  })
  $('#imgDlg').addEventListener('click', () => $('#imgDlg').close())

  // ekran paylaşımı: başlatma penceresi
  $('#shareBtn').addEventListener('click', openShareDlg)
  $('#shareQ').addEventListener('change', e => { updateShareEst(); if (S.share) changeShareQuality(e.target.value) })
  $('#shareCancel').addEventListener('click', () => $('#shareDlg').close())
  $('#shareDone').addEventListener('click', () => $('#shareDlg').close())
  $('#shareStop').addEventListener('click', () => { $('#shareDlg').close(); stopShare() })
  $('#shareForm').addEventListener('submit', e => {
    e.preventDefault()
    $('#shareDlg').close()
    startShare() // seçim penceresi, bu tıklamanın hemen ardından açılmalı
  })

  // ekran paylaşımı: izleme paneli
  $('#watchBtn').addEventListener('click', () => {
    if (S.share) return openSelfWatch()
    const other = S.voice && sharerIn(S.voice.ch)
    if (other && !other.self) openWatch(other.id)
  })
  $('#stageClose').addEventListener('click', closeWatch)
  $('#stageMini').addEventListener('click', () => $('#stage').classList.toggle('mini'))
  $('#stageFull').addEventListener('click', toggleFullscreen)
  $('#stageVideo').addEventListener('click', () => $('#stage').classList.remove('mini'))
  $('#stageVideo').addEventListener('loadedmetadata', updateStageInfo)
  $('#stageVideo').addEventListener('resize', updateStageInfo)
  $('#stageMute').addEventListener('click', () => { stageMuted = !stageMuted; refreshStageAudio() })
  $('#stageVol').addEventListener('input', e => {
    stageVol = Number(e.target.value) / 100
    stageMuted = false
    LS.set('stageVol', stageVol)
    refreshStageAudio()
  })
  refreshStageAudio()

  $('#micBtn').addEventListener('click', toggleMute)
  $('#deafBtn').addEventListener('click', toggleDeaf)
  $('#leaveVoice').addEventListener('click', () => leaveVoice())
  $('#settingsBtn').addEventListener('click', openSettings)
  $('#meBtn').addEventListener('click', () => { renderMe(); $('#profileDlg').showModal() })
  $('#profClose').addEventListener('click', () => $('#profileDlg').close())
  $('#profLogout').addEventListener('click', logout)

  // profil fotoğrafı
  let avBusy = false
  const avatarAction = async fn => {
    if (avBusy) return
    avBusy = true
    $('#avatarBtn').disabled = true
    $('#avatarDel').disabled = true
    try { await fn() } catch (x) {
      console.warn(x)
      toast(x instanceof AuthError ? x.message : 'İşlem başarısız oldu.', 'err')
    } finally {
      avBusy = false
      $('#avatarBtn').disabled = false
      $('#avatarDel').disabled = false
    }
  }
  $('#avatarBtn').addEventListener('click', () => $('#avatarInput').click())
  $('#avatarInput').addEventListener('change', e => {
    const f = e.target.files[0]
    e.target.value = ''
    if (f) avatarAction(async () => { await setAvatar(f); toast('Profil fotoğrafın güncellendi.') })
  })
  $('#avatarDel').addEventListener('click', () => avatarAction(async () => { await removeAvatar(); toast('Profil fotoğrafın kaldırıldı.') }))
  $('#menuBtn').addEventListener('click', openSide)
  $('#closeSide').addEventListener('click', closeDrawers)
  $('#membersBtn').addEventListener('click', openMembers)
  $('#closeMembers').addEventListener('click', closeDrawers)
  $('#scrim').addEventListener('click', closeDrawers)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers() })

  $('#saveSettings').addEventListener('click', saveSettings)

  // ses ayarları: değişiklikler önce taslağa yazılır, test ve hoparlör seviyesi canlı dinlenebilir
  $('#setMic').addEventListener('change', e => { draft.mic = e.target.value; if (test) restartTest() })
  $('#setSounds').addEventListener('change', e => { draft.sounds = e.target.checked })
  $('#setNs').addEventListener('change', e => { draft.ns = e.target.checked; if (test) restartTest() })
  $('#setMicVol').addEventListener('input', e => {
    draft.micVol = Number(e.target.value) / 100
    $('#setMicVolOut').textContent = e.target.value + '%'
  })
  $('#setOutVol').addEventListener('input', e => {
    draft.outVol = Number(e.target.value) / 100
    $('#setOutVolOut').textContent = e.target.value + '%'
    setOutVol(draft.outVol)
  })
  $('#setGate').addEventListener('change', e => { draft.gate = e.target.checked; syncAudioControls() })
  $('#setThresh').addEventListener('input', e => {
    draft.thresh = Number(e.target.value)
    $('#setThreshOut').textContent = draft.thresh + ' dB'
    $('#lvlMark').style.left = lvlPct(draft.thresh) + '%'
  })
  $('#testBtn').addEventListener('click', () => { if (test) stopTest(); else startTest() })
  $('#settingsDlg').addEventListener('close', () => {
    stopTest()
    setOutVol(S.settings.outVol) // kaydedilmeyen hoparlör seviyesi geri alınır
    draft = null
  })
  $('#logoutBtn').addEventListener('click', logout)

  // davet kodu ekranı (üye olmayan hesap)
  $('#inviteForm').addEventListener('submit', e => {
    e.preventDefault()
    redeem($('#inviteCode').value)
  })
  $('#inviteLogout').addEventListener('click', logout)

  // davet kodları penceresi (yönetici)
  $('#invOpen').addEventListener('click', openInvites)
  $('#invNew').addEventListener('click', newInvite)

  $('#udVol').addEventListener('input', e => {
    const v = Number(e.target.value)
    $('#udVolOut').textContent = v + '%'
    const name = S.peers.get(userDlgId)?.name
    if (name == null) return
    LS.set('vol.' + name, v / 100)
    refreshRemoteAudio(userDlgId)
  })
  $('#udLocalMute').addEventListener('click', () => {
    const name = S.peers.get(userDlgId)?.name
    if (name == null) return
    LS.set('mute.' + name, !userMuted(name))
    paintLocalMute(name)
    refreshRemoteAudio(userDlgId)
    renderChannels()
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
