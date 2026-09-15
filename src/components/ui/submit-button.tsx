"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  variant?: "primary" | "secondary";
};

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  ...rest
}: Props) {
  const { pending } = useFormStatus();

  const variantClasses =
    variant === "primary"
      ? "bg-coral text-white hover:bg-coral-dark"
      : "bg-ink text-paper hover:bg-violet";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses} ${className}`}
      {...rest}
    >
      {pending ? pendingLabel ?? "Enviando..." : children}
    </button>
  );
}
