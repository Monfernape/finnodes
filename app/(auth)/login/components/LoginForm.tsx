'use client'
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";

export const LoginForm = () => {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setLoading(true);
    const next = searchParams.get("next") ?? "/expenses";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
        scopes: "read:user user:email",
      },
    });

    if (error) {
      console.error("GitHub sign in failed", error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <Button
        className="w-full"
        onClick={handleGitHubLogin}
        disabled={loading}
      >
        <GithubIcon className="mr-2 h-4 w-4" />
        {loading ? "Redirecting..." : "Sign in with GitHub"}
      </Button>
    </div>
  );
};
