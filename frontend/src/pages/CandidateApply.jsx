import { ArrowLeft, FileUp, Paperclip, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getCandidateDocuments } from "../api/candidate";
import { getErrorMessage } from "../api/client";
import { uploadCandidateDocument } from "../api/documents";
import { applyToJob, getJob } from "../api/jobs";
import { Alert } from "../components/Alert";
import {
  CandidateButton,
  CandidateEmptyState,
  CandidateHero,
  CandidateLoading,
  CandidatePage,
  CandidateSection,
  CandidateSpinner,
  CandidateTextarea,
  formatDate,
  formatDateTime
} from "../components/candidate/CandidateUI";

export function CandidateApply() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [coverLetterText, setCoverLetterText] = useState("");
  const [candidateNote, setCandidateNote] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const [jobResponse, documentsResponse] = await Promise.all([
          getJob(jobId),
          getCandidateDocuments()
        ]);
        setJob(jobResponse.data);
        setDocuments(documentsResponse.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [jobId]);

  function toggleDocument(documentId) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isUploading) {
      setError("Wait for the CV upload to finish before applying.");
      return;
    }
    if (selectedDocumentIds.length === 0) {
      setError("Select or upload at least one document before applying.");
      return;
    }
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const response = await applyToJob(jobId, {
        cover_letter_text: coverLetterText || null,
        candidate_note: candidateNote || null,
        document_ids: selectedDocumentIds
      });
      navigate(`/candidate/job-applications/${response.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadCv(selectedFile) {
    const fileToUpload = selectedFile || uploadFile;
    if (!fileToUpload || isUploading) return;
    setError("");
    setSuccess("");
    setIsUploading(true);
    const formData = new FormData();
    formData.append("document_type", "CV");
    formData.append("file", fileToUpload);
    try {
      const response = await uploadCandidateDocument(formData);
      const uploadedDocument = response.data;
      setDocuments((current) => [
        uploadedDocument,
        ...current.filter((document) => document.id !== uploadedDocument.id)
      ]);
      setSelectedDocumentIds((current) =>
        current.includes(uploadedDocument.id)
          ? current
          : [uploadedDocument.id, ...current]
      );
      setUploadFile(null);
      setUploadInputKey((current) => current + 1);
      setSuccess(`${uploadedDocument.file_name} uploaded and selected.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) return <CandidateLoading label="Loading application form" />;

  return (
    <CandidatePage>
      <Link to={`/candidate/jobs/${jobId}`} className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-[var(--candidate-muted)] hover:text-[var(--candidate-primary)]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to job
      </Link>

      <CandidateHero
        eyebrow={job?.company.name || "Application"}
        title={`Apply to ${job?.title || "this role"}`}
        copy="Attach the evidence HR needs first, then add a short note only where it helps your application."
      >
        <p className="mt-4 text-sm font-bold text-[var(--candidate-muted)]">
          Deadline: {formatDate(job?.deadline)}
        </p>
      </CandidateHero>

      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <CandidateSection eyebrow="Message" title="Application notes">
            <div className="grid gap-4">
              <CandidateTextarea
                label="Cover letter"
                rows="8"
                value={coverLetterText}
                onChange={(event) => setCoverLetterText(event.target.value)}
                helper="Optional. Keep it specific to the role and company."
              />
              <CandidateTextarea
                label="Candidate note"
                rows="4"
                value={candidateNote}
                onChange={(event) => setCandidateNote(event.target.value)}
                helper="Optional private context for HR, such as availability or preferred schedule."
              />
            </div>
          </CandidateSection>

          <CandidateSection eyebrow="Documents" title="Attach existing documents" action={<CandidateButton to="/applications" variant="secondary">Manage tracker documents</CandidateButton>}>
            <div className="space-y-3">
              {documents.length === 0 && (
                <CandidateEmptyState title="No uploaded documents yet">
                  Upload a CV in the panel beside this form, or add documents from your tracker.
                </CandidateEmptyState>
              )}
              {documents.map((document) => {
                const selected = selectedDocumentIds.includes(document.id);
                return (
                  <label
                    key={document.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      selected
                        ? "border-[var(--candidate-primary)] bg-[var(--candidate-surface-soft)]"
                        : "border-[var(--candidate-border)] bg-white hover:border-[var(--candidate-border-strong)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDocument(document.id)}
                      className="mt-1 h-4 w-4 rounded border-[var(--candidate-border-strong)] text-[var(--candidate-primary)] focus:ring-[var(--candidate-primary)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[var(--candidate-ink-strong)]">{document.file_name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--candidate-primary)]">{document.document_type}</p>
                      <p className="mt-1 text-xs text-[var(--candidate-muted)]">Uploaded {formatDateTime(document.created_at)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CandidateSection>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <CandidateSection eyebrow="Upload" title="Add a CV">
            <label className="block rounded-lg border border-dashed border-[var(--candidate-border-strong)] bg-[var(--candidate-surface-soft)] p-5">
              <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--candidate-ink-strong)]">
                <FileUp className="h-4 w-4 text-[var(--candidate-primary)]" aria-hidden="true" />
                Upload CV
              </span>
              <input
                key={uploadInputKey}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                disabled={isUploading}
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  setUploadFile(selectedFile);
                  if (selectedFile) uploadCv(selectedFile);
                }}
                className="mt-3 w-full rounded-lg border border-[var(--candidate-border)] bg-white px-3 py-2 text-sm text-[var(--candidate-ink)]"
              />
            </label>
            <div className="mt-3">
              {isUploading && <CandidateSpinner label="Uploading CV" />}
              {uploadFile && !isUploading && (
                <p className="text-xs text-[var(--candidate-muted)]">Selected: {uploadFile.name}</p>
              )}
            </div>
          </CandidateSection>

          <CandidateSection eyebrow="Review" title="Submission summary">
            <div className="space-y-3 text-sm text-[var(--candidate-ink)]">
              <p className="flex items-center justify-between gap-3">
                <span>Attached documents</span>
                <strong>{selectedDocumentIds.length}</strong>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Cover letter</span>
                <strong>{coverLetterText.trim() ? "Added" : "Optional"}</strong>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Candidate note</span>
                <strong>{candidateNote.trim() ? "Added" : "Optional"}</strong>
              </p>
            </div>
            <CandidateButton
              type="submit"
              disabled={isSubmitting || isUploading || selectedDocumentIds.length === 0}
              className="mt-5 w-full"
            >
              {isSubmitting ? (
                "Submitting"
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit application
                </>
              )}
            </CandidateButton>
            {selectedDocumentIds.length === 0 && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[var(--candidate-muted)]">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                Select or upload at least one document.
              </p>
            )}
          </CandidateSection>
        </aside>
      </form>
    </CandidatePage>
  );
}
