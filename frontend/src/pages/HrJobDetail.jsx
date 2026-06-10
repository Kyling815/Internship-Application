import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { getHrJob, updateHrJobStatus } from "../api/hr";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";

export function HrJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadJob() {
      setError("");
      try {
        const response = await getHrJob(jobId);
        setJob(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  async function handleStatusChange(nextStatus) {
    setError("");
    setSuccess("");
    setIsUpdatingStatus(true);
    try {
      const response = await updateHrJobStatus(jobId, nextStatus);
      setJob(response.data);
      setSuccess(`Job marked as ${nextStatus}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading job</p>;

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {job && (
        <>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {job.company.name}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-950">{job.title}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {job.location || "Flexible"} · {job.work_mode} · {job.employment_type}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <StatusBadge status={job.status} />
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/hr/jobs/${job.id}/edit`}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/hr/jobs/${job.id}/applicants`}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                  >
                    View applicants
                  </Link>
                  {job.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("published")}
                      disabled={isUpdatingStatus}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Publish
                    </button>
                  )}
                  {job.status === "published" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("closed")}
                      disabled={isUpdatingStatus}
                      className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Close job
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.description}</p>
              {job.requirements && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-950">Requirements</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.requirements}</p>
                </>
              )}
              {job.responsibilities && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-950">Responsibilities</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.responsibilities}</p>
                </>
              )}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Posting details</h2>
              <div className="mt-4 space-y-2 text-sm text-zinc-700">
                <p>Deadline: {job.deadline || "Not set"}</p>
                <p>Salary min: {job.salary_min ?? "—"}</p>
                <p>Salary max: {job.salary_max ?? "—"}</p>
                <p>Work mode: {job.work_mode}</p>
                <p>Employment type: {job.employment_type}</p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
