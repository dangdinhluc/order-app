import { Skeleton } from "../ui/Skeleton";

export default function SkeletonTableMap() {
  return (
    <div className="space-y-6 h-full flex flex-col p-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-200" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24 bg-slate-200" />
            <Skeleton className="h-4 w-24 bg-slate-200" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg bg-slate-200" />
            ))}
          </div>
          <Skeleton className="h-10 w-20 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-40 p-5 flex flex-col justify-between"
          >
            <div className="h-1.5 w-full absolute top-0 left-0 bg-slate-200" />
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-8 w-12 bg-slate-200" />
                <Skeleton className="h-3 w-20 bg-slate-200" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full bg-slate-200" />
            </div>
            <div className="flex justify-between items-end">
              <Skeleton className="h-4 w-24 bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
