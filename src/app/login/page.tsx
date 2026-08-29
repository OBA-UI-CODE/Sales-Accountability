"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-surface-base px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-accent-blue" />
          <h1 className="text-2xl font-bold text-text-primary">SaleBook</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Sign in to log today&apos;s sales.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-[11px] font-semibold uppercase tracking-wide text-text-muted"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-wide text-text-muted"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 pr-12 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text-secondary"
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} />
                ) : (
                  <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {state.error && (
            <p className="rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-2xl bg-accent-blue py-3.5 text-[15px] font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Don&apos;t have an account? Ask the shop owner to add you from
          Settings.
        </p>
      </div>
    </main>
  );
}
