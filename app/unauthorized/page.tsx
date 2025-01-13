import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-6 max-w-lg">
        <ShieldX className="w-16 h-16 mx-auto text-red-500" />
        <h1 className="text-3xl font-bold">Unauthorized Access</h1>
        <p className="text-gray-600">
          You don't have permission to access this page. If you believe this is an error,
          please contact support or return to the homepage.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}