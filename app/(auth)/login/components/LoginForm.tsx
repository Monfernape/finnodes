"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const LoginForm = () => {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authError = searchParams.get("error");
  const isAwaitingCode = sentTo !== null || authError === "invalid_magic_link";

  const getSafeNextPath = () => {
    const next = searchParams.get("next") ?? "/";

    if (!next.startsWith("/") || next.startsWith("//")) {
      return "/";
    }

    return next;
  };

  const verifyEmailCode = async (normalizedEmail: string, normalizedOtp: string) => {
    const otpTypes = ["email", "signup"] as const;
    let verificationError: Error | null = null;

    for (const type of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedOtp,
        type,
      });

      if (!error) {
        return null;
      }

      verificationError = error;
    }

    return verificationError;
  };

  const requestEmailCode = async (normalizedEmail: string) => {
    setLoading(true);
    setErrorMessage(null);
    setOtp("");

    const { data: canRequestOtp, error: accessCheckError } =
      await supabase.rpc("can_request_magic_link", {
        email_to_check: normalizedEmail,
      });

    if (accessCheckError) {
      setErrorMessage("Could not verify access. Please try again.");
      setLoading(false);
      return;
    }

    if (!canRequestOtp) {
      setSentTo(normalizedEmail);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSentTo(normalizedEmail);
    setLoading(false);
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email to continue.");
      return;
    }

    setSentTo(null);
    await requestEmailCode(normalizedEmail);
  };

  const handleResendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email before requesting another code.");
      return;
    }

    await requestEmailCode(normalizedEmail);
  };

  const handleChangeEmail = () => {
    setSentTo(null);
    setOtp("");
    setErrorMessage(null);
  };

  const handleOtpLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.replace(/\s/g, "");

    if (!normalizedEmail) {
      setErrorMessage("Enter your email before verifying a code.");
      return;
    }

    if (!normalizedOtp) {
      setErrorMessage("Enter the code from your email.");
      return;
    }

    setVerifyingOtp(true);
    setErrorMessage(null);

    const error = await verifyEmailCode(normalizedEmail, normalizedOtp);

    if (error) {
      setErrorMessage(error.message);
      setVerifyingOtp(false);
      return;
    }

    window.location.assign(getSafeNextPath());
  };

  return (
    <div className="w-full space-y-4 text-left">
      {!isAwaitingCode && (
        <form className="space-y-4" onSubmit={handleEmailLogin}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading || verifyingOtp}
              className="h-12 rounded-2xl"
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl"
            disabled={loading || verifyingOtp}
          >
            {loading ? "Sending code..." : "Send code"}
          </Button>
        </form>
      )}

      {isAwaitingCode && (
        <form className="space-y-3" onSubmit={handleOtpLogin}>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm leading-6 text-gray-600">Code sent to</p>
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-gray-950">
                {sentTo ?? email.trim().toLowerCase()}
              </p>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="shrink-0 text-sm font-semibold text-gray-500 transition hover:text-gray-950"
                disabled={loading || verifyingOtp}
              >
                Change
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">Email code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              disabled={loading || verifyingOtp}
              className="h-12 rounded-2xl text-center tracking-[0.3em]"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl"
            disabled={loading || verifyingOtp}
          >
            {verifyingOtp ? "Verifying..." : "Verify code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-2xl text-gray-500"
            disabled={loading || verifyingOtp}
            onClick={handleResendCode}
          >
            {loading ? "Sending again..." : "Resend code"}
          </Button>
        </form>
      )}

      {errorMessage && (
        <p className="text-center text-sm leading-6 text-red-600">
          {errorMessage}
        </p>
      )}
      {authError === "invalid_magic_link" && !errorMessage && (
        <p className="text-center text-sm leading-6 text-red-600">
          This sign-in attempt could not be verified. Enter your email and the
          latest one-time code instead.
        </p>
      )}
    </div>
  );
};
