# Kayıtlı hesapları takip etme, silme ve değiştirme

Bu dokümanda kayıt olan kullanıcıları nasıl listeleyeceğiniz, sileceğiniz ve plan/rol gibi bilgilerini nasıl değiştireceğiniz anlatılmaktadır.

---

## 1. Hesapları takip etme (liste görme)

Kayıtlı tüm hesaplar **Supabase Dashboard** üzerinden görüntülenir. Uygulama içinde kullanıcı listesi yoktur; e-posta ile tek tek işlem yapılır.

1. [supabase.com/dashboard](https://supabase.com/dashboard) adresine gidin.
2. Projenizi seçin.
3. Sol menüden **Authentication** → **Users** bölümüne girin.
4. Burada tüm kayıtlı kullanıcılar listelenir (e-posta, oluşturulma tarihi, son giriş vb.).

İsterseniz **Table Editor** → `profiles` veya `user_memberships` tablolarından da kullanıcı–plan eşleşmelerini görebilirsiniz.

---

## 2. Hesap silme

Hesap silme işlemi **Supabase Dashboard** üzerinden yapılır. Uygulama içinde “hesap sil” butonu yoktur.

1. **Authentication** → **Users** sayfasına gidin.
2. Silmek istediğiniz kullanıcının satırındaki **⋯** (üç nokta) veya ilgili aksiyon butonuna tıklayın.
3. **Delete user** seçeneğini kullanarak kullanıcıyı silin.

Silinen kullanıcıya ait `profiles`, `user_roles`, `user_memberships` vb. kayıtlar, veritabanında **ON DELETE CASCADE** tanımlıysa otomatik silinir; değilse ilgili tablolardan ayrıca temizlemeniz gerekebilir.

---

## 3. Hesabı değiştirme (plan / rol)

**Rol** (admin / user) ve **üyelik planı** (free, individual, brand, corporate, custom_request) değişiklikleri **Admin paneli** üzerinden yapılır.

1. **Admin** olarak giriş yapın.
2. Sol menüden **Users** (Kullanıcılar) sayfasına gidin.
3. Değiştirmek istediğiniz kullanıcının **e-posta adresini** girin.
4. **Rol** veya **Plan** alanından yeni değeri seçin.
5. **Rolü güncelle** veya **Planı güncelle** butonuna tıklayın.

Bu işlemler arka planda `set-user-role` ve `set-user-membership` Edge Function’larını kullanır; kullanıcı bir sonraki girişinde yeni plan/rol ile devam eder.

---

## Özet tablo

| İşlem              | Nerede yapılır        | Açıklama                                      |
|--------------------|------------------------|-----------------------------------------------|
| Hesapları listele  | Supabase → Auth → Users | Tüm kayıtlı kullanıcılar burada görünür.     |
| Hesap sil          | Supabase → Auth → Users | İlgili kullanıcı satırından Delete user.     |
| Plan / rol değiştir| Admin paneli → Users   | E-posta girip “Planı güncelle” / “Rolü güncelle”. |

---

## Notlar

- **Supabase Service Role Key** sadece sunucu/Edge Function tarafında kullanılmalıdır; tarayıcıda asla kullanmayın.
- Kullanıcı listesini uygulama içinde göstermek isterseniz, Supabase **Admin API** (service role ile) kullanan bir Edge Function yazıp Admin sayfasından çağırabilirsiniz; bu ayrı bir geliştirme konusudur.
