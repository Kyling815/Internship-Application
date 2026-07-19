import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { AppFooter } from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";
import { USER_ROLES } from "../constants";
import { getRoleHomePath } from "../routes/RoleHomeRedirect";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "candidate" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const dashboardPath = user?.role === "hr" ? "/hr/dashboard" : "/candidate/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = await register(form);
      navigate(getRoleHomePath(user.role));
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
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1>Create account</h1>
            <p className="text-sm text-zinc-500">Track applications and AI matches</p>
          </div>
        </div>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Full name</span>
            <input
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              type="password"
              required
              minLength="8"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Account role</span>
            <select
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isLoading ? "Creating account" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-600">
          Already registered? <Link to="/login" className="font-semibold text-zinc-950">Sign in</Link>
        </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <AppFooter tone="auth" />
      </div>
    </div>
  );
}
