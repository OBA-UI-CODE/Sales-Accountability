"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { addStaff, removeStaff, type StaffFormState } from "@/app/(app)/settings/actions";
import type { Profile } from "@/types/database";

const initialState: StaffFormState = {};

export function StaffManager({
  staff,
  ownerId,
}: {
  staff: Profile[];
  ownerId: string;
}) {
  const [state, formAction, pending] = useActionState(addStaff, initialState);
  const [isRemoving, startRemoveTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      window.location.reload();
    }
  }, [state.success]);

  function handleRemove(id: string) {
    startRemoveTransition(async () => {
      await removeStaff(id);
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          Staff Accounts
        </h2>

        <div className="flex flex-col gap-2">
          {staff.length === 0 && (
            <p className="text-sm text-text-muted">
              No staff accounts yet — add one below.
            </p>
          )}
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-[14px] bg-surface-card px-4 py-3.5"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {s.name}
                </p>
                <p className="text-xs capitalize text-text-muted">{s.role}</p>
              </div>
              {s.id !== ownerId &&
                (removingId === s.id ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRemovingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemove(s.id)}
                      className="rounded-lg bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger-text disabled:opacity-40"
                    >
                      {isRemoving ? "Removing..." : "Confirm"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRemovingId(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-muted"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-card p-6">
        <h3 className="mb-4 text-sm font-bold text-text-primary">
          Add a staff account
        </h3>
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Chioma"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Login email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="chioma@example.com"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Temporary password
            </label>
            <input
              name="password"
              type="text"
              minLength={6}
              required
              placeholder="At least 6 characters"
              className="w-full rounded-[14px] border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none"
            />
          </div>

          {state.error && (
            <p className="rounded-[10px] bg-danger-bg px-3 py-2 text-sm text-danger-text">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-accent-blue py-3.5 text-sm font-semibold text-text-primary transition hover:bg-accent-blue-strong disabled:opacity-60"
          >
            {pending ? "Adding..." : "Add Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
