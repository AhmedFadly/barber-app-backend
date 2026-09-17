"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import type { FormState } from "../_lib/form";

/**
 * Submits a server action without React's automatic form reset, so a validation error
 * keeps what the admin typed. Pass `resetOnSuccess` for "add another" style forms.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save changes",
  resetOnSuccess,
  className = "form",
  secondary,
}: {
  action: (fd: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  secondary?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await action(fd);
      setState(result ?? null);
      if (result?.ok && resetOnSuccess) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="form-footer">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {secondary}
        {state && (
          <p className={state.ok ? "form-msg ok" : "form-msg err"} role="status">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
