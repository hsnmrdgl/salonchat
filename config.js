// Salon ayarları.
//
// SUPABASE ANAHTARI GİZLİ DEĞİLDİR: aşağıdaki "anon / publishable" anahtar, tarayıcıda çalışan siteler için
// tasarlanmıştır ve repoda herkese açık durması normaldir. Güvenliği anahtarın gizliliği değil, veritabanındaki
// kurallar (supabase/setup.sql) sağlar.
// Buraya ASLA "service_role" ya da "secret" anahtarını yazma. O, veritabanının tam yetkisidir.

export default {
  // Supabase panelinde: Project Settings > API (ya da Data API) bölümünden.
  supabaseUrl: 'https://bigurkbwvmozfljqecww.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZ3Vya2J3dm1vemZsanFlY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTk1ODEsImV4cCI6MjEwNzIzNTU4MX0.BXcSwL_UrxhPNbVw2kepl-iMnWUkDGqzhzq9fZp-GKQ',

  // Sol üstte görünen ad
  serverName: 'Salon',

  // Sol üstte adın yanında küçük yazıyla görünen sürüm. Her güncellemede elle artır.
  version: '1.14.0',

  // Kanallar. id'ler sabit kalmalı, name istediğin gibi olabilir.
  // adminOnly: true olan metin kanalına sadece yöneticiler yazabilir.
  textChannels: [
    { id: 'duyuru', name: 'duyuru', adminOnly: true },
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
