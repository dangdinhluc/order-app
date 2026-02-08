import { Skeleton } from "../ui/Skeleton";

export default function SkeletonMenu() {
  return (
    <div className="fixed inset-0 bg-stone-900 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <Skeleton className="w-10 h-10 rounded-xl bg-white/10" />
          <Skeleton className="flex-1 h-10 rounded-xl bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded-xl bg-white/10" />
            <Skeleton className="w-10 h-10 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 overflow-hidden flex flex-col">
        {/* Featured Section */}
        <div className="mb-8 mt-2">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-5 h-5 rounded-full bg-white/10" />
            <Skeleton className="w-32 h-6 rounded-full bg-white/10" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="shrink-0 w-[85%] md:w-[60%] aspect-[4/3] rounded-3xl bg-white/5 p-5 flex flex-col justify-end relative overflow-hidden">
                <div className="space-y-3 relative z-10">
                  <Skeleton className="w-2/3 h-8 bg-white/10" />
                  <Skeleton className="w-full h-4 bg-white/10" />
                  <div className="flex justify-between items-center mt-2">
                    <Skeleton className="w-24 h-8 bg-white/10" />
                    <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category & Grid */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="flex-1 h-[1px] bg-white/10" />
            <Skeleton className="w-32 h-6 bg-white/10" />
            <Skeleton className="flex-1 h-[1px] bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                <div className="aspect-square bg-white/10" />
                <div className="p-3 space-y-2">
                  <Skeleton className="w-full h-4 bg-white/10" />
                  <Skeleton className="w-1/2 h-4 bg-white/10" />
                  <Skeleton className="w-20 h-6 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
