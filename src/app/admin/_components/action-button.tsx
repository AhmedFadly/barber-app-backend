"use client";

import { useState, useTransition } from "react";

import type { FormState } from "../_lib/form";

export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  variant = "ghost",
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  variant?: "primary" | "ghost" | "danger";
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(null);

  return (
    <span className="action-button">
      <button
        type="button"
        className={`btn btn-sm btn-${variant}`}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          startTransition(async () => setState((await action()) ?? null));
        }}
      >
        {pending ? (pendingLabel ?? "…") : label}
      </button>
      {state && <span className={state.ok ? "form-msg ok" : "form-msg err"}>{state.message}</span>}
    </span>
  );
}
