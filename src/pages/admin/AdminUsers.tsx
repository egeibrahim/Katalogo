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
  const [plan, setPlan] = useState<"individual" | "corporate" | "custom_request">("individual");
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
          title: "Operation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Role updated",
        description: data?.user_id
          ? `Changes saved. user_id: ${data.user_id}`
          : data?.ok
            ? "Changes saved."
            : "Done.",
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
          title: "Operation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Membership plan updated",
        description: data?.user_id ? `Changes saved. user_id: ${data.user_id}` : "Changes saved.",
      });
      setEmail("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the user's <strong>email</strong> to make them admin. Role assignment can only be done by admin users.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="email">User email</Label>
              <Input
                id="email"
                placeholder="ornek@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="user">user</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">individual</SelectItem>
                  <SelectItem value="corporate">corporate</SelectItem>
                  <SelectItem value="custom_request">custom_request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onSetRole} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving…" : "Update role"}
              </Button>

              <Button variant="secondary" onClick={onSetPlan} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving…" : "Update plan"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEmail("");
                  setRole("admin");
                  setPlan("individual");
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
