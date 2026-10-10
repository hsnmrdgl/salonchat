# Salon

Arkadaş grubu için sesli sohbet uygulaması. Site GitHub Pages'te durur, hesaplar Supabase'in ücretsiz katmanında tutulur. Ses kanalları, metin kanalları, kimin konuştuğunu gösteren halka, mikrofon/kulaklık kapatma, kullanıcı hesabı ve yönetici desteği var.

Derleme gerekmez. Dosyaları olduğu gibi GitHub'a yükleyip Pages'i açman yeterli.

## Kurulum (15 dakika)

### 1. Supabase projesi aç

[supabase.com](https://supabase.com) üzerinden ücretsiz hesap aç ve yeni bir proje oluştur. Sonra **Authentication, Sign In / Providers** sayfasında **Allow anonymous sign-ins** seçeneğini aç. Uygulama her cihaza anonim bir oturum açar, kullanıcı adı ve şifre kontrolünü aşağıdaki SQL yapar.

### 2. Veritabanını kur

1. `supabase/setup.sql` dosyasını aç ve içindeki `DEGISTIR-beni-uzun-bir-sifre` yazısını kendi **sunucu şifrenle** değiştir. Bu şifre kayıt olmak için gerekir, ayrıca ses odalarını da şifreler. Uzun ve tahmin edilmesi zor olsun.
2. Supabase panelinde **SQL Editor** sayfasını aç, dosyanın tamamını yapıştırıp **Run** de.

### 3. `config.js`'i doldur

Supabase panelinde **Project Settings, API** (ya da Data API) sayfasından iki değeri al ve `config.js` içine yaz:

- `supabaseUrl`: Project URL (`https://xxxx.supabase.co`)
- `supabaseAnonKey`: `anon` ya da `publishable` anahtar

### 4. GitHub'a yükle

Dosyaları (`index.html`, `app.js`, `style.css`, `config.js`, `supabase/`) yeni bir GitHub reposuna yükle. **Settings, Pages, Build and deployment, Source: Deploy from a branch** seç, branch `main`, klasör `/ (root)`. Bir dakika sonra adres `https://kullaniciadi.github.io/repo-adi/` olur.

### 5. İlk hesabı sen aç

Adresi arkadaşlarına vermeden önce **Kayıt ol** sekmesinden kendi hesabını aç. **İlk kayıt olan hesap otomatik yönetici olur.** Sonra arkadaşlarına iki şey gönder: sitenin adresi ve sunucu şifresi.

Yerelde denemek için bu klasörde `python3 -m http.server 8080` çalıştırıp `http://localhost:8080` adresini aç. Mikrofon yalnızca `https` ya da `localhost` üzerinde çalışır.

## API anahtarı repoda durabilir mi?

Evet. `anon` / `publishable` anahtarı tarayıcıda çalışan siteler için tasarlanmıştır, kimse için sır değildir. Güvenliği anahtarın gizliliği değil, veritabanındaki kurallar sağlar: tablolar API'ye kapalı bir şemada durur, istemci yalnızca `setup.sql`'deki kayıt, giriş ve dizin fonksiyonlarını çağırabilir, şifreler bcrypt ile saklanır ve yanlış deneme sayısı sınırlıdır.

Repoya **asla** şunları koyma: `service_role` ya da `secret` anahtarı ve veritabanı şifresi. Onlar veritabanının tam yetkisidir.

## Günlük kullanım

Arkadaşların adresi açıp **Kayıt ol** sekmesinde kullanıcı adı, kendi şifresi ve sunucu şifresini yazar. Sonraki girişlerde sadece kullanıcı adı ve şifre yeter. Sunucu şifresi her girişte veritabanından otomatik gelir.

**Yönetici** birini susturabilir, ses kanalından çıkarabilir ve mesaj silebilir. Başka birini yönetici yapmak, şifre sıfırlamak, kullanıcı silmek ve sunucu şifresini değiştirmek için SQL Editor'da çalıştıracağın komutlar `setup.sql` dosyasının sonunda hazır duruyor.

## Nasıl çalışır

- **Hesaplar**: Supabase'te. Kayıt ve giriş, `setup.sql` ile eklenen fonksiyonlarla yapılır (e-posta gerekmez).
- **Ses ve mesajlar**: Tarayıcılar WebRTC ile birbirine doğrudan bağlanır, ses hiçbir sunucudan geçmez. Birbirini bulmak için [Trystero](https://github.com/dmotz/trystero) herkese açık Nostr rölelerini kullanır. Mesajlar kalıcı değildir, yeni giren biri odadaki birinden son mesajları alır.
- **Kimlik doğrulama**: Her hesabın bir anahtar çifti vardır. Odaya girerken herkes bu anahtarla imza atar, diğerleri Supabase'teki hesap listesiyle doğrular. Kayıtlı olmayan ya da başkasının adını taşıyan biri listeye giremez.

## Ücretsiz katman ve sınırlar

- Supabase ücretsiz katmanı bu iş için fazlasıyla yeter (2 proje, 500 MB veritabanı, 50 bin aylık kullanıcı). **Bir hafta boyunca hiç kullanılmazsa proje duraklatılır.** Panelden tek tıkla geri açılır, veri kaybolmaz.
- Supabase, aynı IP'den saatte en fazla 30 anonim oturum açılmasına izin verir. Normal kullanımda sorun olmaz, aynı internetten yirmi kişinin aynı saat içinde ilk kez girmesi sınıra yaklaştırır.
- Şifre unutulursa kullanıcı kendi başına sıfırlayamaz, yönetici SQL ile sıfırlar (komut `setup.sql` sonunda).
- Hesabın gizli anahtarı veritabanında durur, yani Supabase projenin sahibi (sen) teknik olarak her hesabın kimliğini kullanabilir. Arkadaş grubu için normal, herkese açık bir servis için uygun olmaz.
- **Kalabalık**: Herkes herkese doğrudan bağlandığı için bir ses kanalında 6-8 kişiyi aşmak önerilmez. Toplam 15-20 kişi farklı kanallara dağılırsa sorun olmaz. Sınırı `config.js` içindeki `maxPerVoice` ile ayarlarsın.
- **Yönetici komutları** her tarayıcıda uygulanır; kodu değiştirilmiş bir tarayıcı bunları yok sayabilir. Atılan biri tekrar girebilir.
- **Bazı ağlarda bağlantı kurulamaz** (okul, şirket, bazı mobil operatörler). Ses kanalında bir kişinin adı soluk kalıyorsa ve ses gelmiyorsa bu yüzdendir. Çözüm ücretsiz bir TURN sunucusu eklemektir (örn. [Cloudflare Calls TURN](https://developers.cloudflare.com/calls/turn/) ya da [Metered Open Relay](https://www.metered.ca/stun-turn)). Bilgileri `config.js` içindeki `turnConfig` alanına yaz.
- Herkese açık Nostr röleleri ücretsiz ve hesapsızdır ama garanti verilmez.

## Sorun giderme

| Ekrandaki mesaj | Yapılacak |
| --- | --- |
| config.js içine Supabase adresini ve anahtarını yaz | Kurulum 3. adım |
| Supabase'de "Allow anonymous sign-ins" kapalı | Kurulum 1. adım |
| Supabase kurulumu eksik: setup.sql çalıştırılmamış | Kurulum 2. adım. Çalıştırdıysan SQL Editor'da hata çıkıp çıkmadığına bak |
| Çok fazla yanlış deneme yapıldı | 10 dakika bekle |

## Dosyalar

| Dosya | Görevi |
| --- | --- |
| `index.html`, `style.css` | Arayüz |
| `app.js` | Kayıt/giriş, ses, katılımcılar, sohbet, yönetici mantığı |
| `config.js` | Senin ayarların (Supabase adresi ve herkese açık anahtarı, kanallar) |
| `supabase/setup.sql` | Veritabanı kurulumu ve yönetim komutları |
