import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { APPLICATION_STATUSES } from "../constants";

const emptyForm = {
  company_name: "",
  position_title: "",
  job_description: "",
  application_status: "Saved",
  deadline: "",
  notes: ""
};

export function ApplicationForm({ initialValues, isLoading, submitLabel, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initialValues) {
      setForm({
        company_name: initialValues.company_name || "",
        position_title: initialValues.position_title || "",
        job_description: initialValues.job_description || "",
        application_status: initialValues.application_status || "Saved",
        deadline: initialValues.deadline || "",
        notes: initialValues.notes || ""
      });
    }
  }, [initialValues]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      deadline: form.deadline || null,
      notes: form.notes || null
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Company</span>
          <input
            required
            value={form.company_name}
            onChange={(event) => updateField("company_name", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Position</span>
          <input
            required
            value={form.position_title}
            onChange={(event) => updateField("position_title", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Job description</span>
        <textarea
          required
          rows="8"
          value={form.job_description}
          onChange={(event) => updateField("job_description", event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Status</span>
          <select
            value={form.application_status}
            onChange={(event) => updateField("application_status", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Deadline</span>
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => updateField("deadline", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Notes</span>
        <textarea
          rows="4"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

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
