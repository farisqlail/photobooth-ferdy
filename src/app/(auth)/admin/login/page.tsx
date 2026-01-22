"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { useToast } from "../../../../components/ui/toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (error) {
      showToast({
        variant: "error",
        message: error instanceof Error ? error.message : "Supabase error",
      });
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      showToast({ variant: "error", message: error?.message ?? "Login gagal." });
      setIsLoading(false);
      return;
    }
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!adminData) {
      await supabase.auth.signOut();
      showToast({
        variant: "error",
        message: "Akun ini belum terdaftar sebagai admin.",
      });
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    router.push("/admin/settings");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="Email admin"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button onClick={handleLogin} disabled={!email || !password || isLoading}>
            <LogIn className="h-4 w-4" />
            {isLoading ? "Memeriksa..." : "Masuk"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
