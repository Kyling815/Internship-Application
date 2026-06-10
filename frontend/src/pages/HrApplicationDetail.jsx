import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getErrorMessage, resolveApiUrl } from "../api/client";
import {
  getHrApplication,
  getHrDocumentDownloadUrl,
  updateHrApplicationStatus
} from "../api/hr";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";
import { JOB_APPLICATION_STATUSES } from "../constants";

export function HrApplicationDetail() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState(null);

  useEffect(() => {
    async function loadApplication() {
      setError("");
      try {
        const response = await getHrApplication(applicationId);
        setApplication(response.data);
        setStatus(response.data.status);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadApplication();
  }, [applicationId]);

  async function handleDownload(documentId) {
    setError("");
    setActiveDocumentId(documentId);
    try {
      const response = await getHrDocumentDownloadUrl(documentId);
      window.open(resolveApiUrl(response.data.download_url), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActiveDocumentId(null);
    }
  }

  async function handleStatusSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await updateHrApplicationStatus(applicationId, {
        status,
        note: note || null
      });
      setApplication(response.data);
      setStatus(response.data.status);
      setNote("");
      setSuccess("Applicant status updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading applicant detail</p>;

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {application && (
        <>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {application.job_posting.company.name}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
                  {application.candidate.full_name || application.candidate.email}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">{application.candidate.email}</p>
                <p className="mt-3 text-sm text-zinc-600">
                  Applied for {application.job_posting.title} on {new Date(application.submitted_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={application.status} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <aside className="space-y-6">
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Candidate profile</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-700">
                  <p><span className="font-medium text-zinc-950">Name:</span> {application.candidate.profile?.full_name || application.candidate.full_name || "Not provided"}</p>
                  <p><span className="font-medium text-zinc-950">University:</span> {application.candidate.profile?.university || "Not provided"}</p>
                  <p><span className="font-medium text-zinc-950">Major:</span> {application.candidate.profile?.major || "Not provided"}</p>
                  <p><span className="font-medium text-zinc-950">Location:</span> {application.candidate.profile?.location || "Not provided"}</p>
                  <p><span className="font-medium text-zinc-950">Phone:</span> {application.candidate.profile?.phone || "Not provided"}</p>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Attached documents</h2>
                <div className="mt-4 space-y-3">
                  {application.attached_documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{document.file_name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{document.document_type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(document.document_id)}
                        disabled={activeDocumentId === document.document_id}
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Download attached document"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <div className="space-y-6">
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Application content</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">Cover letter</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {application.cover_letter_text || "No cover letter submitted."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">Candidate note</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {application.candidate_note || "No note submitted."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Update status</h2>
                <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                  >
                    {JOB_APPLICATION_STATUSES.filter((value) => value !== "withdrawn").map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <textarea
                    rows="4"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional internal note for this status change"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving" : "Save status"}
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-950">Status history</h2>
                <div className="mt-4 space-y-4">
                  {application.status_history.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-zinc-200 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={entry.new_status} />
                        <p className="text-sm text-zinc-600">
                          {entry.old_status ? `From ${entry.old_status}` : "Initial submission"}
                        </p>
                      </div>
                      {entry.note && <p className="mt-2 text-sm text-zinc-700">{entry.note}</p>}
                      <p className="mt-2 text-xs text-zinc-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
