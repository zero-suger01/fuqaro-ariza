"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { GuestButton } from "@/components/guest/GuestButton";
import { GuestPageTitle } from "@/components/guest/GuestPageTitle";
import { digitsAfterCountryCode, formatUzPhoneDisplay, isValidUzPhone } from "@/lib/phone";

export function Step3Contact({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  phoneDigits,
  onPhoneDigitsChange,
  submitting,
  submitError,
  onBack,
  onSubmit,
}: {
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("wizard.step3");
  const tWizard = useTranslations("wizard");
  const [touched, setTouched] = useState(false);

  const nameValid = firstName.trim().length > 0;
  const phoneValid = isValidUzPhone(phoneDigits);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameValid && phoneValid) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <GuestPageTitle icon={User}>{t("title")}</GuestPageTitle>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-text-secondary">{t("firstNameLabel")}</label>
          <input
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder={t("firstNamePlaceholder")}
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-text-secondary">{t("lastNameLabel")}</label>
          <input
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder={t("lastNamePlaceholder")}
            className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
          />
        </div>
      </div>
      {touched && !nameValid && <p className="text-base text-danger">{t("nameRequired")}</p>}

      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-text-secondary">{t("phoneLabel")}</label>
        <input
          type="tel"
          inputMode="numeric"
          value={formatUzPhoneDisplay(phoneDigits)}
          onChange={(e) => onPhoneDigitsChange(digitsAfterCountryCode(e.target.value))}
          placeholder="+998 (90) 123-45-67"
          className="min-h-[56px] w-full rounded-control border-2 border-border-strong bg-bg-surface px-4 text-lg text-text-primary outline-none focus:border-accent"
        />
        <p className="text-base text-text-muted">{t("phoneNote")}</p>
        {touched && !phoneValid && <p className="text-base text-danger">{t("phoneInvalid")}</p>}
      </div>

      {submitError && <p className="text-base text-danger">{submitError}</p>}

      <div className="flex gap-3">
        <GuestButton type="button" variant="secondary" onClick={onBack} className="flex-1" disabled={submitting}>
          {tWizard("back")}
        </GuestButton>
        <GuestButton type="submit" className="flex-[2]" disabled={submitting}>
          {submitting ? t("submitting") : t("submitButton")}
        </GuestButton>
      </div>
    </form>
  );
}
