import { BriefcaseBusiness, Clock3, FileText, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getCandidateDashboard } from "../api/candidate";
import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";

export function CandidateDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setError("");
      try {
        const response = await getCandidateDashboard();
        setDashboard(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (isLoading) return <p className="text-sm text-zinc-500">Loading candidate dashboard</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Candidate dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track personal applications, browse internships, and follow employer updates.
          </p>
        </div>
        <Link
          to="/candidate/jobs"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Browse jobs
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      {dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BriefcaseBusiness} label="Saved opportunities" value={dashboard.total_personal_applications} />
            <StatCard icon={Send} label="Submitted job applications" value={dashboard.total_submitted_job_applications} tone="sky" />
            <StatCard icon={FileText} label="Recent documents" value={dashboard.recent_documents.length} tone="emerald" />
            <StatCard icon={Clock3} label="Upcoming deadlines" value={dashboard.upcoming_deadlines.length} tone="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-zinc-950">Recent job applications</h2>
                <Link to="/candidate/job-applications" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
                  View all
                </Link>
              </div>
              <div className="mt-4 divide-y divide-zinc-100">
                {dashboard.recent_job_applications.length === 0 && (
                  <p className="py-6 text-sm text-zinc-500">No submitted job applications yet.</p>
                )}
                {dashboard.recent_job_applications.map((application) => (
                  <Link
                    key={application.id}
                    to={`/candidate/job-applications/${application.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {application.job_posting.company.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {application.job_posting.title}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Upcoming deadlines</h2>
              <div className="mt-4 space-y-3">
                {dashboard.upcoming_deadlines.length === 0 && (
                  <p className="text-sm text-zinc-500">No upcoming deadlines yet.</p>
                )}
                {dashboard.upcoming_deadlines.map((item) => (
                  <div key={`${item.type}-${item.label}-${item.deadline}`} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{item.label}</p>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">{item.type}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">Deadline: {item.deadline}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-zinc-950">Recent documents</h2>
              <Link to="/applications" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
                Manage tracker documents
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.recent_documents.length === 0 && (
                <p className="text-sm text-zinc-500">Upload documents through your personal tracker applications.</p>
              )}
              {dashboard.recent_documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-zinc-200 p-4">
                  <p className="truncate text-sm font-semibold text-zinc-950">{document.file_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{document.document_type}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Uploaded {new Date(document.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
