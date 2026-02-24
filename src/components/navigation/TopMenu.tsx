import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const TOP_NAV = [
  { label: "Catalog", to: "/catalog/all" },
  { label: "Solutions", to: "#" },
  { label: "Academy", to: "#" },
  { label: "Blog", to: "#" },
  { label: "Enterprise", to: "#" },
  { label: "Affiliate", to: "#" },
] as const;

export function TopMenu() {
  const { user, signInWithGoogle } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <header className={`sticky top-0 z-50 border-b topbar-landing-standard ${scrolled ? "topbar-landing-standard--scrolled" : ""}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/home" className="text-sm font-semibold tracking-tight" aria-label="CatalogApp">
          CATALOGAPP
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Top menu">
          {TOP_NAV.map((item) =>
            item.to === "#" ? (
              <a key={item.label} href="#" className="text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} to={item.to} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground md:flex">
            <Globe className="h-4 w-4" aria-hidden />
            <span>USD</span>
          </div>

          {!user ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="hidden md:inline-flex"
                onClick={onGoogle}
              >
                Continue with Google
              </Button>

              <Link className="hidden text-sm font-medium md:inline-flex" to="/auth">
                Login
              </Link>

              <Button asChild>
                <Link to="/pricing">Get Started</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/catalog/all">Catalog</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
