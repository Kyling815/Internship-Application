import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-950">Unauthorized</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your account does not have access to that page.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Go back
        </Link>
      </div>
    </div>
  );
}
