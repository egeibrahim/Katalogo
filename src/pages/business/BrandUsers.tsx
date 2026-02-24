import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

type CreateUserResponse = {
  ok?: boolean;
  user_id?: string;
  error?: string;
};

export default function BrandUsers() {
  usePageMeta({ title: "Kullanıcı Oluştur", description: "Marka panelinden kullanıcı oluştur", noIndex: true });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length >= 6;
  }, [email, password]);

  const onCreateUser = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<CreateUserResponse>("brand-create-user", {
        body: {
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim() || undefined,
        },
      });

      if (error) {
        const msg = (data as CreateUserResponse | null)?.error ?? error.message;
        toast({ title: "Kullanıcı oluşturulamadı", description: msg, variant: "destructive" });
        return;
      }

      toast({
        title: "Kullanıcı oluşturuldu",
        description: data?.user_id ? `user_id: ${data.user_id}` : "Yeni kullanıcı eklendi.",
      });
      setEmail("");
      setPassword("");
      setFullName("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Marka Kullanıcısı Oluştur</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bu formdan oluşturulan kullanıcılar otomatik olarak <strong>Brand</strong> planı ile açılır.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="brand-user-fullname">Ad Soyad (opsiyonel)</Label>
              <Input
                id="brand-user-fullname"
                placeholder="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand-user-email">E-posta</Label>
              <Input
                id="brand-user-email"
                type="email"
                placeholder="ornek@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand-user-password">Geçici Şifre</Label>
              <Input
                id="brand-user-password"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onCreateUser} disabled={!canSubmit || submitting}>
                {submitting ? "Oluşturuluyor…" : "Kullanıcı oluştur"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEmail("");
                  setPassword("");
                  setFullName("");
                }}
                disabled={submitting}
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
