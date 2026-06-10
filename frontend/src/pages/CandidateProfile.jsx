import { useEffect, useState } from "react";

import { getCandidateProfile, updateCandidateProfile } from "../api/candidate";
import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";

const emptyForm = {
  full_name: "",
  university: "",
  major: "",
  graduation_year: "",
  phone: "",
  location: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  bio: ""
};

export function CandidateProfile() {
  const [form, setForm] = useState(emptyForm);
  const [profileId, setProfileId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setError("");
      try {
        const response = await getCandidateProfile();
        const profile = response.data;
        setProfileId(profile.id);
        setForm({
          full_name: profile.full_name || "",
          university: profile.university || "",
          major: profile.major || "",
          graduation_year: profile.graduation_year ?? "",
          phone: profile.phone || "",
          location: profile.location || "",
          linkedin_url: profile.linkedin_url || "",
          github_url: profile.github_url || "",
          portfolio_url: profile.portfolio_url || "",
          bio: profile.bio || ""
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await updateCandidateProfile({
        ...form,
        graduation_year: form.graduation_year === "" ? null : Number(form.graduation_year),
        phone: form.phone || null,
        university: form.university || null,
        major: form.major || null,
        location: form.location || null,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        portfolio_url: form.portfolio_url || null,
        bio: form.bio || null
      });
      setProfileId(response.data.id);
      setSuccess("Candidate profile updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading candidate profile</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Candidate profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Keep your academic and portfolio details ready for HR review.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Full name</span>
            <input
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Phone</span>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">University</span>
            <input
              value={form.university}
              onChange={(event) => updateField("university", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Major</span>
            <input
              value={form.major}
              onChange={(event) => updateField("major", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Graduation year</span>
            <input
              type="number"
              min="1900"
              max="2100"
              value={form.graduation_year}
              onChange={(event) => updateField("graduation_year", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Location</span>
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">LinkedIn URL</span>
            <input
              value={form.linkedin_url}
              onChange={(event) => updateField("linkedin_url", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">GitHub URL</span>
            <input
              value={form.github_url}
              onChange={(event) => updateField("github_url", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Portfolio URL</span>
            <input
              value={form.portfolio_url}
              onChange={(event) => updateField("portfolio_url", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Bio</span>
          <textarea
            rows="6"
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving" : profileId ? "Save profile" : "Create profile"}
        </button>
      </form>
    </div>
  );
}
