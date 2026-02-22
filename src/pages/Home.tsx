import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Chrome } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { CatalogFooter } from "@/components/newcatalog/layout/CatalogFooter";

export default function Home() {
  const { user, role, isAdmin, isLoading, signInWithGoogle } = useAuth();

  usePageMeta({ title: "Ürün Kataloğu" });

  const onGetStartedGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google ile giriş başarısız",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
      <header className="grid gap-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] md:text-6xl">
            Ürün kataloğunu tasarla, yönet, yayınla.
          </h1>
          <p className="mt-5 max-w-prose text-pretty text-base text-muted-foreground md:text-lg">
            CatalogApp; ürünlerini kategori/kolleksiyon halinde sergilemen, varyantlarını yönetmen ve tasarım
            çıktıları üretmen için hızlı bir çalışma alanı sunar.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to="/catalog/all">Kataloğa Git</Link>
            </Button>
            {!user ? (
              <Button asChild variant="outline">
                <Link to="#get-started">Get Started</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to={isAdmin ? "/admin/dashboard" : "/"}>Panele Git</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="md:col-span-5">
          <section id="get-started" className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Get Started</h2>
            {!user ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Google ile ya da e‑posta/şifre ile giriş yap.</p>
                <div className="mt-4 grid gap-2">
                  <Button variant="outline" onClick={onGetStartedGoogle}>
                    <Chrome className="mr-2 h-4 w-4" /> Gmail ile devam et
                  </Button>
                  <Button asChild>
                    <Link to="/auth">E‑posta ile devam et</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Zaten giriş yaptın. Devam etmek için:</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAdmin ? (
                    <Button asChild>
                      <Link to="/admin/dashboard">Admin Panel</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/catalog/all">Kataloğa Git</Link>
                  </Button>
                </div>
              </>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">Oturum</div>
                  <div className="mt-1 text-muted-foreground">
                    {isLoading ? (
                      "Kontrol ediliyor…"
                    ) : user ? (
                      <span>
                        {user.email ?? "(e‑posta yok)"} · <span className="font-mono">{user.id}</span>
                      </span>
                    ) : (
                      "Giriş yapılmadı"
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={isAdmin ? "default" : "secondary"}>{role ?? "—"}</Badge>
                  {isAdmin ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/dashboard">Admin Panel</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </header>

      <section className="mt-14 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold">Koleksiyonlar</h3>
          <p className="mt-2 text-sm text-muted-foreground">Ürünleri koleksiyon mantığıyla bir araya getir.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold">Tasarım</h3>
          <p className="mt-2 text-sm text-muted-foreground">Ürün tasarımcısı ile hızlı mockup üret.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold">Yönetim</h3>
          <p className="mt-2 text-sm text-muted-foreground">Admin panelden içerikleri düzenle ve yayınla.</p>
        </div>
      </section>
      </div>
      <CatalogFooter />
    </div>
  );
}
