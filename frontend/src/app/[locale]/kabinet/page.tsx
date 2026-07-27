"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ClipboardList, Copy, LogIn, LogOut, Phone, Plus, Trash2, User, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GuestShell } from "@/components/guest/GuestShell";
import { GuestButton } from "@/components/guest/GuestButton";
import { GuestPageTitle } from "@/components/guest/GuestPageTitle";
import { ComplaintStatusStepper } from "@/components/kabinet/ComplaintStatusStepper";
import { apiDelete, apiGet, apiPost, setToken, ApiError } from "@/lib/api";
import { digitsAfterCountryCode, formatUzPhoneDisplay, isValidUzPhone, toE164 } from "@/lib/phone";
import { formatDate } from "@/lib/formatDate";
import type { AuthUser, CitizenComplaint } from "@/lib/types";

interface TokenResponse {
  access_token: string;
  user: AuthUser;
}

export default function KabinetPage() {
  const t = useTranslations("kabinet");
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

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  async function copyTicket(id: string, ticketNumber: string) {
    try {
      await navigator.clipboard.writeText(ticketNumber);
      setCopiedTicketId(id);
      setTimeout(() => setCopiedTicketId(null), 2000);
    } catch {
      // clipboard unavailable — no-op, the number is already on screen
    }
  }

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

  async function handleClearAll() {
    setClearing(true);
    try {
      await apiDelete("/api/citizen/complaints");
      setComplaints([]);
      setConfirmingClear(false);
    } catch {
      // Tarmoq xatosi — banner ochiq qoladi, fuqaro qayta urinishi mumkin.
    } finally {
      setClearing(false);
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
      <GuestPageTitle icon={ClipboardList}>{t("title")}</GuestPageTitle>

      {/* "Yangi murojaat" va "Tozalash" bir xil (accent) rangda — ikkalasi
          ham shu ro'yxat bilan bog'liq oddiy harakat. "Chiqish" shu qatorning
          o'ng tomonida (mijoz so'ragan tartib). */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/yangi"
          className="flex items-center gap-1.5 whitespace-nowrap text-base font-semibold text-accent hover:underline underline-offset-2"
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          {t("newComplaint")}
        </Link>
        {complaints.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="flex items-center gap-1.5 whitespace-nowrap text-base font-semibold text-accent hover:underline underline-offset-2"
          >
            <Trash2 className="h-5 w-5 shrink-0" aria-hidden />
            {t("clear")}
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-base font-semibold text-danger hover:underline underline-offset-2"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          {t("logout")}
        </button>
      </div>

      {confirmingClear && (
        <div className="flex flex-col gap-4 rounded-card border-2 border-danger bg-danger/5 p-5">
          <p className="text-lg font-semibold text-text-primary">{t("clearConfirmTitle")}</p>
          <p className="text-base text-text-secondary">{t("clearConfirmText")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              disabled={clearing}
              className="min-h-[56px] flex-1 rounded-card border-2 border-border-strong bg-bg-surface text-lg font-semibold text-text-primary hover:bg-bg-subtle disabled:opacity-50"
            >
              {t("clearCancel")}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="min-h-[56px] flex-1 rounded-card bg-danger text-lg font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {clearing ? t("clearing") : t("clearConfirm")}
            </button>
          </div>
        </div>
      )}

      {complaints.length === 0 ? (
        <p className="text-center text-lg text-text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map((c, i) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-card bg-bg-surface p-5 shadow-card">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                  <span>
                    <span className="font-normal text-text-muted">№{i + 1}</span> {c.ticket_number}
                    {c.department && (
                      <span className="font-normal text-text-secondary"> ({c.department.name})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyTicket(c.id, c.ticket_number)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-bg-subtle hover:text-accent"
                    aria-label={c.ticket_number}
                  >
                    {copiedTicketId === c.id ? (
                      <Check className="h-4 w-4 text-success" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </p>
                {/* Ovozli murojaatda backend transkriptsiya bilan to'ldiradi
                    (app/routers/citizen.py) — bu yerda rasm/video ko'rsatilmaydi,
                    faqat matn (mijoz so'ragan: ovozni ijro etib bo'lmaydi). */}
                {c.description && (
                  <p className="line-clamp-3 text-base text-text-secondary">{c.description}</p>
                )}
                <p className="mt-auto text-sm text-text-muted">{formatDate(c.created_at, locale)}</p>
                {/* Murojaatni shaxsan olib borayotgan xodim — admin panelda
                    xodim "qabul qildim" deb belgilagach ko'rinadi
                    (app/routers/citizen.py: Complaint.assigned_user). */}
                {c.assigned_staff && (
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{c.assigned_staff.name}</span>
                    <a
                      href={`tel:${c.assigned_staff.phone}`}
                      className="ml-1 flex items-center gap-1 whitespace-nowrap text-accent hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      {formatUzPhoneDisplay(digitsAfterCountryCode(c.assigned_staff.phone))}
                    </a>
                  </div>
                )}
              </div>
              <ComplaintStatusStepper status={c.status_simple} />
            </div>
          ))}
        </div>
      )}
    </GuestShell>
  );
}
