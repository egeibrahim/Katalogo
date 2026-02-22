# Business kataloglarının Google'da bulunması

Business hesapların katalogları sitemiz üzerinden `/brand/:slug` URL’leriyle yayınlanıyor. Google’ın bu sayfaları bulabilmesi için yapılanlar:

## Yapılanlar

1. **Markalar sayfası (`/brands`)**  
   Tüm yayındaki kataloglar listeleniyor; her biri `/brand/slug` linkine gidiyor. Üst menüde “Markalar” linki var. Google bu sayfayı tarayıp katalog sayfalarına linklerle ulaşabiliyor.

2. **Katalog sayfası SEO**  
   - Meta description: Katalog adı + ürün sayısı (örn. “X kataloğu – 12 ürün”).  
   - JSON-LD (CollectionPage + ItemList): Sayfanın bir ürün listesi olduğu Google’a bildiriliyor.

3. **robots.txt**  
   Tarayıcılar için izinler zaten açık; sitemap için yorum satırı eklendi.

## İsteğe bağlı: Sitemap

Katalog URL’lerini daha hızlı keşfetmesi için sitemap ekleyebilirsiniz:

- **Seçenek A:** Vercel/Netlify vb. bir **serverless function** ile `/sitemap.xml` döndürün. Fonksiyon Supabase’den `is_public = true` katalogları çekip her biri için `https://siteniz.com/brand/{slug}` satırlarını XML olarak üretsin.
- **Seçenek B:** Cron veya build sonrası çalışan bir **script** ile aynı listeyi alıp `public/sitemap.xml` dosyasını oluşturun.

Sonra `public/robots.txt` içinde şu satırı ekleyin (domain’i kendi sitenizle değiştirin):

```
Sitemap: https://www.siteniz.com/sitemap.xml
```
