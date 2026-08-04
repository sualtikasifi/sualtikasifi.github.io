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
kutusunu mutlaka işaretleyin.

### 1.2 Bu klasörü bilgisayara indirin

Bu `excel-sync` klasörünü (içindeki tüm dosyalarla) bilgisayarınızda kalıcı
bir yere kopyalayın, örn. `C:\MarderCiftlik\excel-sync\`.

### 1.3 Gerekli kütüphaneleri kurun

Bu klasörde bir komut satırı (PowerShell veya CMD) açıp:

```
pip install -r requirements.txt
```

### 1.4 Siteye özel bir "senkronizasyon" hesabı oluşturun

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

### 1.5 Ayar dosyasını oluşturun

`config.example.json` dosyasını aynı klasörde `config.json` olarak
kopyalayın ve içindeki değerleri doldurun:

| Alan | Ne yazılacak |
|---|---|
| `excel_path` | Excel dosyanızın tam yolu (örn. `C:\\Users\\Ahmet\\OneDrive\\...\\BUZAĞILIK TEDAVİLER.xlsx`) |
| `sheet_name` | Genelde değiştirmeyin: `BUZAĞI TEDAVİ 2025` |
| `supabase_url` | Supabase panelinde Project Settings → API → Project URL |
| `supabase_anon_key` | Aynı sayfada **anon public** key (service_role değil!) |
| `sync_email` / `sync_password` | 1.4'te oluşturduğunuz hesabın bilgileri |

**`config.json` dosyasını kimseyle paylaşmayın ve asla GitHub'a yüklemeyin**
(zaten `.gitignore` ile hariç tutuldu) — içinde şifre var.

### 1.6 İlk çalıştırmayı elle yapıp kontrol edin

```
python sync.py
```

Ekranda ne yapıldığını göreceksiniz. `logs\sync.log` dosyasından da her zaman
geçmişi görebilirsiniz. Sonrasında Excel dosyanızı açıp yeni bir `SENKRON_ID`
sütununun eklendiğini ve (varsa) yeni satırların geldiğini kontrol edin.

Hiçbir şeyi değiştirmeden sadece ne olacağını görmek isterseniz
`config.json`'da `"dry_run": true` yapıp tekrar çalıştırabilirsiniz.

### 1.7 Günde 2 kez otomatik çalışmasını sağlayın

Bu klasörde PowerShell açıp:

```
powershell -ExecutionPolicy Bypass -File install_task_scheduler.ps1
```

Bu, Windows Görev Zamanlayıcı'ya `MarderCiftlik-ExcelSenkron` adında, her gün
07:00 ve 19:00'da çalışacak bir görev ekler.

**Eğer bu script çalışmazsa** (bazı kurumsal bilgisayarlarda PowerShell
script'leri engellenmiş olabilir), elle kurmak için:

1. Başlat menüsünden **"Görev Zamanlayıcı"** (Task Scheduler) açın.
2. Sağdan **"Temel Görev Oluştur"**a tıklayın, bir isim verin (örn.
   `MarderCiftlik-ExcelSenkron`).
3. Tetikleyici olarak **Günlük**, saat **07:00** seçin.
4. Eylem olarak **"Bir program başlat"**, program yerine `python.exe`'nin
   tam yolunu (`where python` ile bulabilirsiniz), argüman olarak
   `sync.py`'nin tam yolunu, "Başlangıç konumu" olarak da bu klasörü girin.
5. Görevi bitirin, sonra görevin özelliklerine girip **Tetikleyiciler**
   sekmesinden ikinci bir tetikleyici ekleyip saat **19:00** yapın.

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
| `Yapilandirma dosyasi bulunamadi` | `config.json` oluşturulmamış, adım 1.5'i tekrarlayın |
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
