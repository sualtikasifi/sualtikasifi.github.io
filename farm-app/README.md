# Marder Ciftlik Yonetimi

Marder hayvancilik ciftligi icin kayit tutma, is takibi ve haberlesme uygulamasi.
PWA (Progressive Web App) olarak calisir: hem iOS hem Android'de tarayicidan
acilir ve "Ana Ekrana Ekle" ile uygulama gibi kullanilabilir.

## Faz 1 kapsami (bu asamada tamamlanan)

- Hayvan kayitlari (kupe no, dogum tarihi, irk, anne, durum)
- Tedavi kayitlari (genel, mastitis - meme bazli, buzagi besleme)
- Gorev atama ve programlama (tarih + saat, calisanlar arasi)
- Panel: bugunun gorevleri, geciken gorevler, son tedaviler
- Demo modu: Supabase baglantisi olmadan tarayicida ornek verilerle calisir

## Gelistirme

```bash
npm install
npm run dev
```

`http://localhost:3000` adresini acin. Supabase baglantisi kurulmadan **demo modda**
calisir; veriler tarayicinin localStorage'inda saklanir, giris ekraninda
"Demo hesabiyla gir" butonuna basmak yeterlidir.

## Supabase'e baglanma (gercek veritabani)

1. [supabase.com](https://supabase.com) uzerinde ucretsiz bir proje olusturun.
2. Proje SQL Editor'unde `supabase/schema.sql` dosyasindaki sorguyu calistirin.
3. Supabase panelinde Authentication > Providers altindan Email/Password'u
   acik oldugundan emin olun, kullanicilari (calisanlari) buradan davet edin.
4. `.env.example` dosyasini `.env.local` olarak kopyalayin ve Supabase proje
   ayarlarindan (Project Settings > API) URL ve anon key degerlerini girin.
5. `npm run dev` ile yeniden baslatin; artik demo modu otomatik kapanir ve
   gercek Supabase veritabanina baglanir.

## Build / statik export

```bash
npm run build
```

`out/` klasorunde statik dosyalar olusur; herhangi bir statik hosting'de
(GitHub Pages dahil) yayinlanabilir. Tum veri islemleri tarayicidan dogrudan
Supabase'e yapildigi icin sunucu tarafi (Node) gerekmez.

## Sirada ne var (Faz 2 / Faz 3)

- Faz 2: Tohumlama kayitlari + sperma stok yonetimi
- Faz 3: OPU / embriyo laboratuvar takibi
- Faz 4: Push bildirimleri, offline senkronizasyon, PDF/Excel rapor cikti
