import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-6 md:p-10">
        <div className="mb-8">
          <Skeleton className="h-screen rounded-lg" />
        </div>
      </main>
    </div>
  );
}
