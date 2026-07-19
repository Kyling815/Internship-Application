import { BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { AppFooter } from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";
import { getRoleHomePath } from "../routes/RoleHomeRedirect";

function canReturnToPath(pathname, role) {
  if (!pathname || pathname === "/login" || pathname === "/register" || pathname === "/unauthorized") {
    return false;
  }

  if (role === "admin") return true;
  if (pathname === "/chat" || pathname === "/search" || pathname === "/settings") return true;
  if (role === "hr") return pathname.startsWith("/hr");
  return pathname.startsWith("/candidate") || pathname.startsWith("/applications");
}

export function Login() {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  if (isAuthenticated) {
    const dashboardPath = user?.role === "hr" ? "/hr/dashboard" : "/candidate/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = await login(email, password);
      const nextPath = location.state?.from?.pathname;
      navigate(canReturnToPath(nextPath, user.role) ? nextPath : getRoleHomePath(user.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="aesthetic-auth flex min-h-screen flex-col px-4 py-8">
      <div className="flex flex-1 items-center justify-center">
        <div className="aesthetic-auth-card w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="aesthetic-auth-mark p-3">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <h1>Internship Tracker</h1>
            <p className="text-sm text-zinc-500">Sign in to continue</p>
          </div>
        </div>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isLoading ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-600">
          No account? <Link to="/register" className="font-semibold text-zinc-950">Create one</Link>
        </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <AppFooter tone="auth" />
      </div>
    </div>
  );
}
