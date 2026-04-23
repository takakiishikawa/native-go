"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function LoginToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("login") === "success") {
      toast.success("ログインしました");
      const url = new URL(window.location.href);
      url.searchParams.delete("login");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
