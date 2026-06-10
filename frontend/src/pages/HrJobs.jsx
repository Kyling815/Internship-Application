import { Edit, Eye, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { deleteHrJob, getHrJobs, updateHrJobStatus } from "../api/hr";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";

export function HrJobs() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadJobs() {
    setError("");
    setIsLoading(true);
    try {
      const response = await getHrJobs();
      setJobs(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleDelete(jobId) {
    if (!window.confirm("Delete this job posting?")) return;
    setError("");
    try {
      await deleteHrJob(jobId);
      setJobs((current) => current.filter((job) => job.id !== jobId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleStatusToggle(job) {
    const nextStatus = job.status === "published" ? "closed" : "published";
    setError("");
    try {
      const response = await updateHrJobStatus(job.id, nextStatus);
      setJobs((current) => current.map((item) => (item.id === job.id ? response.data : item)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Job postings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Draft, publish, and close internship opportunities for your company.
          </p>
        </div>
        <Link
          to="/hr/jobs/new"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          New job
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-5 text-sm text-zinc-500">Loading jobs</p>
        ) : jobs.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No jobs created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-950">{job.title}</td>
                    <td className="px-4 py-3 text-zinc-600">{job.location || "Flexible"}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-zinc-600">{job.deadline || "None"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/hr/jobs/${job.id}`}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100"
                          aria-label="View job"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/hr/jobs/${job.id}/edit`}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100"
                          aria-label="Edit job"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(job)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                          {job.status === "published" ? "Close" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                          className="rounded-lg border border-zinc-200 p-2 text-rose-700 hover:bg-rose-50"
                          aria-label="Delete job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
