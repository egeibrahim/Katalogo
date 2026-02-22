# Teklif + Tasarım: Elimizde Neler Var, Neler Eksik, Nereden Başlıyoruz?

Bu dosya teknik terimler olmadan, günlük dille yazılmıştır.

---

## 1. Elimizde neler var? (Şu an çalışan kısım)

- **Tasarım alanı (Designer)**  
  Ürünün ön/arka vb. görünümlerine metin ve görsel ekleyebiliyorsunuz. Bu tasarımlar düzgün çalışıyor.

- **Sepete ekleme**  
  "Sepete ekle" deyince ürün sepete gidiyor ve **o ürünün tasarımı da** sepette saklanıyor. Yani:
  - Hangi ürün (ad, kod, renk, beden seçimi vb.)
  - Kaç adet (ve istenirse bedene göre: S: 2, M: 5 gibi)
  - **Tasarımın kendisi** (hangi görünüme ne koyuldu: yazılar, logolar vb.)  
  Hepsi sepette tutuluyor. Bu kısım **tamam**.

- **Sepet sayfası**  
  Kullanıcı sepetteki ürünleri, adetleri ve “tasarımlı” olanları görebiliyor. "Teklif iste" butonu var ve tıklanınca bir form açılıyor (firma, iletişim, e-posta vb.).

- **Teklif formu**  
  Form doldurulup "Teklif gönder" denince ekranda “Teklif talebiniz alındı” mesajı çıkıyor. Yani buton ve form **görüntü olarak** çalışıyor.

**Özet:** Tasarım yapma, sepete atma ve teklif formunu açıp doldurma tarafı **elimizde var**.

---

## 2. Neler eksik? (Yapılması gerekenler)

İki büyük eksik var:

### Eksik 1: Gönderilen bilgi eksik

"Teklif gönder"e basıldığında **şu an sadece** şunlar “gönderiliyor” gibi hazırlanıyor:

- Ürün adı, kodu, beden, renk, adet, fiyat  
- “Bu satırda tasarım var” bilgisi (evet/hayır)  
- Varsa tasarımın adı  

**Eksik kalan:**

- **Tasarımın içeriği** (hangi görünüme hangi yazı/görsel kondu, konumları, boyutları vb.) hiç eklenmiyor.  
- **Beden bazlı adet** (S: 2, M: 5 gibi) bazı senaryolarda gönderilmiyor olabilir.

Yani: Tarafınıza iletilmesi gereken **tam liste** (adetler + tasarımlar) şu an **tam iletilmiyor**.

### Eksik 2: Gerçekten bir yere iletilmiyor

"Teklif gönder"e basınca bilgiler şu an sadece tarayıcının geliştirici konsoluna yazılıyor. Yani:

- Veritabanına kayıt yok  
- E-posta gitmiyor  
- Başka bir sunucuya / sisteme gönderim yok  

Yani teklif **gerçek anlamda hiçbir yere gitmiyor**; sadece ekranda “alındı” mesajı görünüyor.

---

## 3. Nereden başlıyoruz? (Önerilen sıra)

### Başlangıç noktası: “Gönderilen bilgiyi tam yap”

Önce “Teklif gönder”e basıldığında **hangi bilginin toplanacağı** net olsun. Yani:

1. **Adetler**  
   Toplam adet + (varsa) beden bazlı adet (S: 2, M: 5 vb.) mutlaka gönderilecek listede olsun.

2. **Tasarımlar**  
   Tasarımlı her ürün için “bu satırda tasarım var” demekle kalmayalım; **tasarımın içeriği** de (hangi görünümde ne var) gönderilecek veriye eklensin.

Bu adımda hâlâ “gerçekten e-posta/veritabanına gönderme” yapmayabiliriz; sadece **hazırlanan bilgi paketini** (adetler + tasarımlar dahil) **tam** hale getiririz. İsterseniz bu paketi önce ekranda veya konsolda göstererek “işte gidecek olan tam veri”yi doğrulayabiliriz.

### Sonraki adım: “Bir yere gerçekten gönder”

Bilgi paketi tamam olduktan sonra:

- Bu paketi **veritabanına** (ör. “teklif talepleri” tablosu) kaydetmek,  
- veya **e-posta** ile size iletmek,  
- veya ikisi birden  

gibi bir “gerçek gönderim” adımı eklenir. Bu, sizin tercih ettiğiniz yönteme (e-posta / veritabanı / başka sistem) göre planlanır.

### (İsteğe bağlı) Tasarımdaki görseller

Tasarımda kullanıcı yüklediği **görseller** (logo, resim) şu an tarayıcıya özel geçici adreslerle tutuluyor. Bu adresler e-postada veya veritabanında uzun süre kullanılamaz. İleride bu görselleri:

- ya metin gibi bir formata çevirip teklif verisine ekleyeceğiz,  
- ya da kalıcı bir depolama alanına yükleyip oradan linkleyeceğiz.  

Bu, “gönderilen bilgiyi tam yap” ve “bir yere gerçekten gönder” adımları bittikten sonra da ele alınabilir.

---

## 4. Kısa tablo

| Konu | Durum | Ne yapacağız? |
|------|--------|----------------|
| Tasarım yapma, sepete atma | Var | Bir şey yok. |
| Sepette adet / beden / tasarım tutma | Var | Bir şey yok. |
| Teklif formu (açılma, alanlar) | Var | Bir şey yok. |
| Gönderilecek bilginin **tam** olması (adet + tasarım içeriği) | Eksik | **Buradan başlıyoruz:** Teklif gönderirken toplanan veriye adetleri ve tasarım içeriğini ekleyeceğiz. |
| Bu bilgiyi gerçekten bir yere kaydetmek / iletmek | Eksik | Sonraki adım: veritabanı veya e-posta. |
| Tasarımdaki görsellerin kalıcı olması | İleride | İsteğe bağlı; daha sonra. |

---

## 5. Tek cümleyle

- **Elimizde:** Tasarım, sepete ekleme, teklif formu.  
- **Eksik:** Teklifte adet + tasarımın tam iletilmesi ve bu bilginin gerçekten bir yere (veritabanı / e-posta) gönderilmesi.  
- **Başlangıç:** Önce “Teklif gönder”e basıldığında gidecek bilgiyi **tam** yapalım (adetler + tasarım içeriği); sonra bu bilgiyi gerçekten kaydedip/iletecek sistemi ekleyelim.

İstersen bir sonraki adımda doğrudan “gönderilen bilgiyi tam yap” kısmının kod tarafını (hangi dosyada ne ekleyeceğimiz) adım adım yazabilirim.
