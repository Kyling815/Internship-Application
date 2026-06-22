import { BookmarkPlus, MapPin, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createApplication } from "../api/applications";
import { getErrorMessage } from "../api/client";
import { getJob } from "../api/jobs";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";

export function CandidateJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadJob() {
      setError("");
      try {
        const response = await getJob(jobId);
        setJob(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  async function saveJob() {
    if (!job) return;

    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await createApplication({
        company_name: job.company.name,
        position_title: job.title,
        job_description: buildSavedJobDescription(job),
        application_status: "Saved",
        deadline: job.deadline || null,
        notes: "Saved from Job Board."
      });
      setSuccess("Job saved.");
      navigate(`/applications/${response.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
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
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {job.company.name}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-950">{job.title}</h1>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {job.location || "Location flexible"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MonitorSmartphone className="h-4 w-4" />
                    {job.work_mode}
                  </span>
                  <span>{job.employment_type}</span>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <StatusBadge status={job.status} />
                <button
                  type="button"
                  onClick={saveJob}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  {isSaving ? "Saving" : "Save"}
                </button>
                <Link
                  to={`/candidate/jobs/${job.id}/apply`}
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Apply now
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Role overview</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.description}</p>
              {job.responsibilities && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-950">Responsibilities</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.responsibilities}</p>
                </>
              )}
              {job.requirements && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-zinc-950">Requirements</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{job.requirements}</p>
                </>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Company</h2>
                <p className="mt-3 text-sm font-semibold text-zinc-950">{job.company.name}</p>
                <p className="mt-1 text-sm text-zinc-600">{job.company.industry || "Industry not listed"}</p>
                <p className="mt-1 text-sm text-zinc-600">{job.company.location || "Location not listed"}</p>
                {job.company.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-zinc-700 hover:text-zinc-950"
                  >
                    Visit company website
                  </a>
                )}
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Application details</h2>
                <div className="mt-3 space-y-2 text-sm text-zinc-600">
                  <p>{job.deadline ? `Deadline: ${job.deadline}` : "No deadline listed"}</p>
                  <p>
                    Salary: {job.salary_min ?? "Not listed"} {job.salary_max ? `to ${job.salary_max}` : ""}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function buildSavedJobDescription(job) {
  return [
    job.description,
    job.responsibilities ? `Responsibilities:\n${job.responsibilities}` : null,
    job.requirements ? `Requirements:\n${job.requirements}` : null
  ]
    .filter(Boolean)
    .join("\n\n");
}
