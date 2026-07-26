"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clsx } from "clsx";
import { ClipboardList, LogIn, UserPlus } from "lucide-react";
import { GuestShell } from "@/components/guest/GuestShell";
import { GuestButton, GuestLinkButton } from "@/components/guest/GuestButton";
import { GuestPageTitle } from "@/components/guest/GuestPageTitle";
import { apiGet, apiPost, setToken, ApiError } from "@/lib/api";
import { digitsAfterCountryCode, formatUzPhoneDisplay, isValidUzPhone, toE164 } from "@/lib/phone";
import { formatDate } from "@/lib/formatDate";
import type { AuthUser, CitizenComplaint } from "@/lib/types";

interface TokenResponse {
  access_token: string;
  user: AuthUser;
}

const STATUS_BADGE: Record<CitizenComplaint["status_simple"], string> = {
  qabul_qilindi: "bg-bg-subtle text-text-secondary",
  korilmoqda: "bg-accent-soft text-accent",
  ijroda: "bg-warning/10 text-warning",
  yakunlandi: "bg-success/10 text-success",
  rad_etildi: "bg-danger/10 text-danger",
};

export default function KabinetPage() {
  const t = useTranslations("kabinet");
  const tStatus = useTranslations("status.steps");
  const locale = useLocale();

  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AuthUser>("/api/auth/me")
      .then((me) => {
        if (me.kind === "citizen") {
          setUser(me);
        }
      })
      .catch(() => {
        // Sessiya yo'q — login/ro'yxatdan o'tish shakli ko'rsatiladi.
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiGet<CitizenComplaint[]>("/api/citizen/complaints")
      .then(setComplaints)
      .catch(() => setComplaints([]));
  }, [user]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidUzPhone(phoneDigits) || password.length < 6 || (mode === "register" && !firstName.trim())) {
      setError(t("error"));
      return;
    }
    setSubmitting(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { login: toE164(phoneDigits), password }
          : {
              first_name: firstName,
              last_name: lastName || undefined,
              phone: toE164(phoneDigits),
              password,
              language: locale,
            };
      const res = await apiPost<TokenResponse>(path, body);
      setToken(res.access_token);
      setUser(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setComplaints([]);
    setPhoneDigits("");
    setPassword("");
    setFirstName("");
    setLastName("");
  }

  if (checkingSession) {
    return <GuestShell>{null}</GuestShell>;
  }

  if (!user) {
    return (
      <GuestShell>
        <GuestPageTitle icon={mode === "login" ? LogIn : UserPlus}>
          {mode === "login" ? t("loginTitle") : t("registerTitle")}
        </GuestPageTitle>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium text-text-secondary">{t("lastNameLabel")}</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium text-text-secondary">{t("firstNameLabel")}</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-text-secondary">{t("phoneLabel")}</label>
            <input
              type="tel"
              inputMode="numeric"
              value={formatUzPhoneDisplay(phoneDigits)}
              onChange={(e) => setPhoneDigits(digitsAfterCountryCode(e.target.value))}
              placeholder="+998 (90) 123-45-67"
              className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-text-secondary">{t("passwordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-base text-danger">{error}</p>}

          <GuestButton type="submit" disabled={submitting}>
            {submitting ? t("loggingIn") : mode === "login" ? t("loginButton") : t("registerButton")}
          </GuestButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="text-center text-base text-accent underline underline-offset-2"
        >
          {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
        </button>
      </GuestShell>
    );
  }

  return (
    <GuestShell>
      <div className="flex items-center justify-between">
        <GuestPageTitle icon={ClipboardList}>{t("title")}</GuestPageTitle>
        <button type="button" onClick={handleLogout} className="text-base text-text-muted underline underline-offset-2">
          {t("logout")}
        </button>
      </div>

      <GuestLinkButton href="/yangi" variant="secondary">
        {t("newComplaint")}
      </GuestLinkButton>

      {complaints.length === 0 ? (
        <p className="text-center text-lg text-text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-card bg-bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-text-primary">{c.ticket_number}</p>
                <span className={clsx("rounded-pill px-3 py-1 text-sm font-medium", STATUS_BADGE[c.status_simple])}>
                  {tStatus(c.status_simple)}
                </span>
              </div>
              <p className="text-base text-text-secondary">{c.category.name}</p>
              <p className="text-sm text-text-muted">{formatDate(c.created_at, locale)}</p>
            </div>
          ))}
        </div>
      )}
    </GuestShell>
  );
}
