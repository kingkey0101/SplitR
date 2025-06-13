import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] px-4 text-center">
      <h1 className="text-6xl font-bold gradient-title mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <Button
       
        className="bg-green-400 md:inline-flex items-center gap-2 hover:text-green-600 hover:border-green-600 transition"
      >
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
