export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-card" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-card md:col-span-1" />
        <div className="h-32 animate-pulse rounded-2xl bg-surface-card" />
        <div className="h-32 animate-pulse rounded-2xl bg-surface-card" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[14px] bg-surface-card"
          />
        ))}
      </div>
    </div>
  );
}
