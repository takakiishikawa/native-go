"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginPage } from "@takaki/go-design-system";
import { Languages } from "lucide-react";

function LoginContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <LoginPage
      productName="NativeGo"
      productLogo={
        <Languages
          size={24}
          style={{ color: "var(--color-primary)" }}
        />
      }
      tagline="Native Camp 学習管理アプリ"
      onGoogleSignIn={handleGoogleSignIn}
    />
  );
}

export default function LoginPageRoute() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
