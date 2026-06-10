import { useEffect, useState } from "react";

import { createCompany, getMyCompany, updateCompany } from "../api/companies";
import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";

const emptyForm = {
  name: "",
  description: "",
  website: "",
  industry: "",
  location: "",
  logo_url: ""
};

export function HrCompany() {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      setError("");
      try {
        const response = await getMyCompany();
        setCompany(response.data);
        setForm({
          name: response.data.name || "",
          description: response.data.description || "",
          website: response.data.website || "",
          industry: response.data.industry || "",
          location: response.data.location || "",
          logo_url: response.data.logo_url || ""
        });
      } catch (err) {
        if (err?.response?.status !== 404) {
          setError(getErrorMessage(err));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    const payload = {
      ...form,
      description: form.description || null,
      website: form.website || null,
      industry: form.industry || null,
      location: form.location || null,
      logo_url: form.logo_url || null
    };

    try {
      const response = company
        ? await updateCompany(company.id, payload)
        : await createCompany(payload);
      setCompany(response.data);
      setSuccess(company ? "Company updated." : "Company created.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading company profile</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Company profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set up the company identity candidates will see on the job board.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Company name</span>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Industry</span>
            <input
              value={form.industry}
              onChange={(event) => updateField("industry", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Website</span>
            <input
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Location</span>
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Logo URL</span>
          <input
            value={form.logo_url}
            onChange={(event) => updateField("logo_url", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Description</span>
          <textarea
            rows="6"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving" : company ? "Save company" : "Create company"}
        </button>
      </form>
    </div>
  );
}
