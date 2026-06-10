import { BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { getRoleHomePath } from "../routes/RoleHomeRedirect";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = await login(email, password);
      const nextPath = location.state?.from?.pathname;
      navigate(nextPath || getRoleHomePath(user.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-zinc-900 p-3 text-white">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950">Internship Tracker</h1>
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
  );
}
