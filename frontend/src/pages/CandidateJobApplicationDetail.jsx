import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getCandidateJobApplication,
  withdrawCandidateJobApplication
} from "../api/candidate";
import { getErrorMessage, resolveApiUrl } from "../api/client";
import { getDocumentDownloadUrl } from "../api/documents";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";

export function CandidateJobApplicationDetail() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    async function loadApplication() {
      setError("");
      try {
        const response = await getCandidateJobApplication(applicationId);
        setApplication(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadApplication();
  }, [applicationId]);

  async function openDocument(documentId) {
    setError("");
    setActiveDocumentId(documentId);
    try {
      const response = await getDocumentDownloadUrl(documentId);
      window.open(resolveApiUrl(response.data.download_url), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActiveDocumentId(null);
    }
  }

  async function handleWithdraw() {
    if (!window.confirm("Withdraw this job application?")) return;
    setError("");
    setSuccess("");
    setIsWithdrawing(true);
    try {
      const response = await withdrawCandidateJobApplication(applicationId);
      setApplication(response.data);
      setSuccess("Application withdrawn.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  }

  const canWithdraw = application && !["offered", "rejected", "withdrawn"].includes(application.status);

  if (isLoading) return <p className="text-sm text-zinc-500">Loading submitted application</p>;

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {application && (
        <>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {application.job_posting.company.name}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
                  {application.job_posting.title}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Submitted {new Date(application.submitted_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <StatusBadge status={application.status} />
                {canWithdraw && (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWithdrawing ? "Withdrawing" : "Withdraw"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Submission details</h2>
              <div className="mt-4 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Cover letter</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {application.cover_letter_text || "No cover letter provided."}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Candidate note</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {application.candidate_note || "No note provided."}
                  </p>
                </div>
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
                      onClick={() => openDocument(document.document_id)}
                      disabled={activeDocumentId === document.document_id}
                      className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Download document"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Status timeline</h2>
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
        </>
      )}
    </div>
  );
}
