import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { JOB_EMPLOYMENT_TYPES, JOB_POSTING_STATUSES, JOB_WORK_MODES } from "../constants";

const emptyForm = {
  title: "",
  description: "",
  requirements: "",
  responsibilities: "",
  location: "",
  employment_type: "internship",
  work_mode: "onsite",
  salary_min: "",
  salary_max: "",
  deadline: "",
  status: "draft"
};

export function JobPostingForm({ initialValues, isLoading, submitLabel, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!initialValues) return;
    setForm({
      title: initialValues.title || "",
      description: initialValues.description || "",
      requirements: initialValues.requirements || "",
      responsibilities: initialValues.responsibilities || "",
      location: initialValues.location || "",
      employment_type: initialValues.employment_type || "internship",
      work_mode: initialValues.work_mode || "onsite",
      salary_min: initialValues.salary_min ?? "",
      salary_max: initialValues.salary_max ?? "",
      deadline: initialValues.deadline || "",
      status: initialValues.status || "draft"
    });
  }, [initialValues]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      requirements: form.requirements || null,
      responsibilities: form.responsibilities || null,
      location: form.location || null,
      salary_min: form.salary_min === "" ? null : Number(form.salary_min),
      salary_max: form.salary_max === "" ? null : Number(form.salary_max),
      deadline: form.deadline || null
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Job title</span>
          <input
            required
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
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
        <span className="text-sm font-medium text-zinc-700">Description</span>
        <textarea
          required
          rows="8"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Requirements</span>
          <textarea
            rows="5"
            value={form.requirements}
            onChange={(event) => updateField("requirements", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Responsibilities</span>
          <textarea
            rows="5"
            value={form.responsibilities}
            onChange={(event) => updateField("responsibilities", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Employment type</span>
          <select
            value={form.employment_type}
            onChange={(event) => updateField("employment_type", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          >
            {JOB_EMPLOYMENT_TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Work mode</span>
          <select
            value={form.work_mode}
            onChange={(event) => updateField("work_mode", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          >
            {JOB_WORK_MODES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Salary min</span>
          <input
            type="number"
            min="0"
            value={form.salary_min}
            onChange={(event) => updateField("salary_min", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Salary max</span>
          <input
            type="number"
            min="0"
            value={form.salary_max}
            onChange={(event) => updateField("salary_max", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Deadline</span>
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => updateField("deadline", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          >
            {JOB_POSTING_STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isLoading ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
