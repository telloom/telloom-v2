import { Skeleton } from "@/components/ui/skeleton";

export default function ExecutorDashboardLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      
      <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 