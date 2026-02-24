import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AdminUsers() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [plan, setPlan] = useState<"free" | "individual" | "brand" | "corporate" | "custom_request">("free");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !!email.trim();
  }, [email]);

  const onSetRole = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-user-role", {
        body: { email: email.trim(), role },
      });

      if (error) {
toast({
        title: "İşlem başarısız",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Rol güncellendi",
        description: data?.user_id
          ? `Kaydedildi. user_id: ${data.user_id}`
          : data?.ok
            ? "Kaydedildi."
            : "Tamamlandı.",
      });
      setEmail("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSetPlan = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-user-membership", {
        body: { email: email.trim(), plan },
      });

      if (error) {
        toast({
          title: "İşlem başarısız",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Plan güncellendi",
        description: data?.user_id ? `Kaydedildi. user_id: ${data.user_id}` : "Kaydedildi.",
      });
      setEmail("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Kullanıcılar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kayıt olan hesapları <strong>Supabase Dashboard → Authentication → Users</strong> üzerinden listeleyebilir ve silebilirsiniz. Plan veya rol değiştirmek için aşağıya kullanıcının <strong>e‑posta</strong> adresini girin.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Detaylı rehber: <code className="rounded bg-muted px-1">docs/KULLANICI_YONETIMI.md</code>
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="email">Kullanıcı e‑postası</Label>
              <Input
                id="email"
                placeholder="ornek@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="individual">Kişisel</SelectItem>
                  <SelectItem value="brand">Marka</SelectItem>
                  <SelectItem value="corporate">Kurumsal</SelectItem>
                  <SelectItem value="custom_request">Özel talep</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onSetRole} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Kaydediliyor…" : "Rolü güncelle"}
              </Button>

              <Button variant="secondary" onClick={onSetPlan} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Kaydediliyor…" : "Planı güncelle"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEmail("");
                  setRole("admin");
                  setPlan("free");
                }}
                disabled={isSubmitting}
              >
                Temizle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
