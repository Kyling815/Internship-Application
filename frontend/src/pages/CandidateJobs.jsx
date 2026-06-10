import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { getJobs } from "../api/jobs";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";
import { JOB_EMPLOYMENT_TYPES, JOB_WORK_MODES } from "../constants";

const initialFilters = {
  keyword: "",
  location: "",
  work_mode: "",
  employment_type: ""
};

export function CandidateJobs() {
  const [filters, setFilters] = useState(initialFilters);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadJobs(activeFilters = filters) {
    setError("");
    setIsLoading(true);
    try {
      const response = await getJobs(activeFilters);
      setJobs(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs(filters);
  }, []);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    loadJobs(filters);
  }

  function handleReset() {
    setFilters(initialFilters);
    loadJobs(initialFilters);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Job board</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse published internship opportunities from HR teams.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_1fr_180px_180px_auto_auto]">
        <input
          value={filters.keyword}
          onChange={(event) => updateFilter("keyword", event.target.value)}
          placeholder="Search title or keyword"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        />
        <input
          value={filters.location}
          onChange={(event) => updateFilter("location", event.target.value)}
          placeholder="Location"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        />
        <select
          value={filters.work_mode}
          onChange={(event) => updateFilter("work_mode", event.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        >
          <option value="">All work modes</option>
          {JOB_WORK_MODES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <select
          value={filters.employment_type}
          onChange={(event) => updateFilter("employment_type", event.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
        >
          <option value="">All employment types</option>
          {JOB_EMPLOYMENT_TYPES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Reset
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading jobs</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
          No published jobs matched your filters.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    {job.company.name}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-950">{job.title}</h2>
                </div>
                <StatusBadge status={job.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{job.location || "Location flexible"}</span>
                <span>{job.work_mode}</span>
                <span>{job.employment_type}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-700">
                {job.description}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-500">
                  {job.deadline ? `Deadline: ${job.deadline}` : "No deadline listed"}
                </p>
                <Link
                  to={`/candidate/jobs/${job.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                >
                  View job
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
