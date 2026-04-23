"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginPage } from "@takaki/go-design-system";
import { RefreshCcw } from "lucide-react";

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
        <div className="flex items-center justify-center rounded-md bg-primary p-2">
          <RefreshCcw className="h-4 w-4 text-white" />
        </div>
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
