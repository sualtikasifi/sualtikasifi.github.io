# Buzağı Tedavileri Excel ↔ Site Senkronizasyonu

Bu klasördeki program, `BUZAĞI TEDAVİ 2025` Excel sayfanız ile Marder Çiftlik
sitesindeki tedavi kayıtlarını **günde iki kez** (varsayılan: 07:00 ve 19:00)
karşılıklı olarak eşitler:

- Excel'e elle yeni bir tedavi satırı girildiğinde → siteye eklenir.
- Siteden yeni bir tedavi kaydedildiğinde → Excel'e yeni satır olarak eklenir.
- **Son 30 günlük** pencere içindeki kayıtlar senkronize edilir; daha eski
  satırlara hiç dokunulmaz.
- Aynı kayıt hem Excel'de hem sitede değiştirilmişse (çakışma), **hiçbir
  taraf otomatik ezilmez** — kayıt olduğu gibi bırakılır ve dosyaya eklenen
  `CAKISMALAR (kontrol edin)` sayfasına yazılır, elle karar vermeniz için.
- Excel'deki **GRUP** (İglo/Sıra) bilgisi senkronize edilmez — sitede
  hayvanın konumu her zaman o an hangi kulübede olduğuna göre otomatik
  belirlenir; geçmiş konum bilgisiyle karıştırılmaz.
- Her çalıştırmadan önce Excel dosyanızın otomatik bir yedeği alınır
  (`backups/` klasörü).

Bu program **sadece bu bilgisayarda, bilgisayar açık ve internete bağlıyken**
çalışır — bulut tabanlı değildir.

---

## 1. Kurulum (bir kere yapılır)

### 1.1 Python'u kurun

[python.org/downloads](https://www.python.org/downloads/) adresinden Python
3.11 veya üzerini indirip kurun. Kurulum ekranında **"Add python.exe to PATH"**
kutusunu mutlaka işaretleyin. (Zaten kuruluysa bu adımı atlayın.)

### 1.2 Bu klasörü bilgisayara indirin

Bu `excel-sync` klasörünü (içindeki tüm dosyalarla) bilgisayarınızda kalıcı
bir yere kopyalayın, örn. `C:\MarderCiftlik\excel-sync\`.

### 1.3 Siteye özel bir "senkronizasyon" hesabı oluşturun

Bu programın sitede kendi adına işlem yapabilmesi için ayrı bir hesaba
ihtiyacı var (kendi hesabınızı kullanmayın):

1. Supabase projenizin panelinde **Authentication → Users → Add user**'a
   gidin.
2. E-posta olarak örn. `excel-sync@marder-ciftlik.local`, güçlü bir şifre
   girin, **"Auto Confirm User"** kutusunu işaretleyip kaydedin.
3. **SQL Editor**'e gidip `grant-sync-user-permission.sql` dosyasının
   içeriğini (e-postayı kendi girdiğinizle değiştirerek) bir kez çalıştırın.
   Bu, o hesaba sadece buzağı tedavilerini ekleme/silme yetkisi verir —
   başka hiçbir şeye erişemez.

Bu hesabın e-postasını ve şifresini bir kenara not edin, bir sonraki adımda
lazım olacak.

### 1.4 Kurulum sihirbazını çalıştırın

`kurulum.bat` dosyasına **çift tıklayın**. Sırayla:

- Gerekli kütüphaneleri kendisi kurar,
- Excel dosyanızı seçmeniz için bir pencere açar (elle yol yazmanız gerekmez),
- Supabase adresinizi ve 1.3'te oluşturduğunuz hesabın bilgilerini sorar,
- isterseniz hemen bir deneme çalıştırması yapıp sonucu gösterir,
- isterseniz günde 2 kez (07:00/19:00) otomatik çalışmasını kurar.

Hepsi bu — `config.json` dosyasını elle oluşturmanıza veya komut satırı
kullanmanıza gerek yok. Sorulara cevap verip Enter'a basmanız yeterli.

**PowerShell script'leri engellenmiş bir kurumsal bilgisayardaysanız** son
adımda ("Görev Zamanlayıcı" kurulumu) hata alabilirsiniz — bu durumda elle
kurmak için:

1. Başlat menüsünden **"Görev Zamanlayıcı"** (Task Scheduler) açın.
2. Sağdan **"Temel Görev Oluştur"**a tıklayın, bir isim verin (örn.
   `MarderCiftlik-ExcelSenkron`).
3. Tetikleyici olarak **Günlük**, saat **07:00** seçin.
4. Eylem olarak **"Bir program başlat"**, program yerine `python.exe`'nin
   tam yolunu (`where python` ile bulabilirsiniz), argüman olarak
   `sync.py`'nin tam yolunu, "Başlangıç konumu" olarak da bu klasörü girin.
5. Görevi bitirin, sonra görevin özelliklerine girip **Tetikleyiciler**
   sekmesinden ikinci bir tetikleyici ekleyip saat **19:00** yapın.

### Elle senkronizasyon çalıştırmak isterseniz

Otomatik saatleri beklemeden hemen bir senkronizasyon yapmak isterseniz
`senkronize_et.bat` dosyasına çift tıklamanız yeterli.

---

## 2. Günlük kullanım

Programı kurduktan sonra hiçbir şey yapmanıza gerek yok — her gün 07:00 ve
19:00'da kendiliğinden çalışır. Sadece:

- **Bilgisayarın o saatlerde açık ve oturumun açık olması gerekir.**
  Kapalıysa o çalıştırma atlanır, bir sonrakinde devam eder.
- Senkronizasyon sırasında **Excel dosyasını kapalı tutun** — açıksa
  Windows dosyayı kilitler, program bunu fark edip o çalıştırmayı atlar ve
  log dosyasına net bir mesaj yazar (veri kaybı olmaz, bir dahaki
  çalıştırmada devam eder).

### Çakışma çıkarsa ne yapmalıyım?

Excel dosyanızda bir `CAKISMALAR (kontrol edin)` sayfası oluşur (varsa).
Orada hangi kayıtta hem Excel hem site tarafında farklı değer olduğu, hangi
değerin ne olduğu yazar. Doğru olanı elle (hem Excel'e hem siteye) girip
düzeltmeniz yeterli — bir sonraki senkronizasyonda otomatik olarak normale
döner.

---

## 3. Sorun giderme

| Belirti | Muhtemel sebep / çözüm |
|---|---|
| `Yapilandirma dosyasi bulunamadi` | `config.json` oluşturulmamış, `kurulum.bat`'ı çalıştırın |
| `Siteye giris yapilamadi` | `sync_email`/`sync_password` yanlış, ya da internet yok |
| `Excel dosyasi acik veya kilitli` | Excel'i kapatıp tekrar çalıştırın (veya bir sonraki otomatik çalıştırmayı bekleyin) |
| Bir küpe no siteye eklenmiyor, log'da hata var | `logs\sync.log`'daki hata mesajını okuyun — genelde geçersiz/boş bir değer olur |
| Görev Zamanlayıcı'da görev "başarısız" görünüyor ama log temiz | Görev "yalnızca kullanıcı oturum açıkken" ayarlı olabilir; bilgisayar o saatte kilit ekranındaysa da genelde çalışır ama tamamen çıkış yapılmışsa çalışmaz |

Programı geçici olarak durdurmak isterseniz Görev Zamanlayıcı'da görevi
sağ tıklayıp **Devre Dışı Bırak**'ı seçmeniz yeterli; Excel ve site normal
kullanılmaya devam eder, sadece otomatik eşitleme durur.

---

## 4. Testler (geliştirme/bakım için)

Bu programda değişiklik yapılırsa, gerçek verinize dokunmadan mantığın hâlâ
doğru çalıştığını doğrulamak için:

```
python test_sync.py
```

Bu, sahte (bellek içi) bir site ve geçici bir Excel dosyasıyla tüm
senaryoları (yeni kayıt, güncelleme, çakışma, silme, vb.) test eder.
