// Salon ayarları.
//
// SUPABASE ANAHTARI GİZLİ DEĞİLDİR: aşağıdaki "anon / publishable" anahtar, tarayıcıda çalışan siteler için
// tasarlanmıştır ve repoda herkese açık durması normaldir. Güvenliği anahtarın gizliliği değil, veritabanındaki
// kurallar (supabase/setup.sql) sağlar.
// Buraya ASLA "service_role" ya da "secret" anahtarını yazma. O, veritabanının tam yetkisidir.

export default {
  // Supabase panelinde: Project Settings > API (ya da Data API) bölümünden.
  supabaseUrl: 'https://DEGISTIR.supabase.co',
  supabaseAnonKey: 'DEGISTIR-anon-ya-da-publishable-anahtar',

  // Sol üstte görünen ad
  serverName: 'Salon',

  // Kanallar. id'ler sabit kalmalı, name istediğin gibi olabilir.
  textChannels: [
    { id: 'genel', name: 'genel' },
    { id: 'muhabbet', name: 'muhabbet' }
  ],
  voiceChannels: [
    { id: 'salon', name: 'Salon' },
    { id: 'oyun', name: 'Oyun' },
    { id: 'sessiz-kose', name: 'Sessiz köşe' }
  ],

  // Bir ses kanalında aynı anda en fazla kaç kişi olabilir.
  // Herkes herkese doğrudan bağlandığı için 6-8 üstü önerilmez.
  maxPerVoice: 8,

  // Bazı ağlarda (okul, şirket, bazı mobil operatörler) doğrudan bağlantı kurulamaz.
  // O durumda ücretsiz bir TURN sunucusu ekle. Örnek:
  // turnConfig: [{ urls: ['turn:sunucu.ornek.com:443'], username: 'kullanici', credential: 'sifre' }]
  turnConfig: []
}
