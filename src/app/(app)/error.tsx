"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-subtle px-6 py-16 text-center">
      <p className="text-sm font-semibold text-text-primary">
        Something went wrong loading this page.
      </p>
      <p className="max-w-sm text-xs text-text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-text-primary"
      >
        Try again
      </button>
    </div>
  );
}
