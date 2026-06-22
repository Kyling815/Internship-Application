import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getCandidateDocuments } from "../api/candidate";
import { getErrorMessage } from "../api/client";
import { uploadCandidateDocument } from "../api/documents";
import { applyToJob, getJob } from "../api/jobs";
import { Alert } from "../components/Alert";

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

  if (isLoading) return <p className="text-sm text-zinc-500">Loading application form</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Apply to {job?.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a CV or attach existing tracker documents before submitting your application.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-950">{job?.company.name}</p>
          <p className="mt-1 text-sm text-zinc-600">{job?.title}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {job?.deadline ? `Deadline: ${job.deadline}` : "No deadline listed"}
          </p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Cover letter</span>
          <textarea
            rows="8"
            value={coverLetterText}
            onChange={(event) => setCoverLetterText(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Candidate note</span>
          <textarea
            rows="4"
            value={candidateNote}
            onChange={(event) => setCandidateNote(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Upload CV</span>
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
              />
            </label>
          </div>
          {isUploading && (
            <p className="mt-2 text-xs font-medium text-zinc-700">
              Uploading CV...
            </p>
          )}
          {uploadFile && !isUploading && (
            <p className="mt-2 text-xs text-zinc-500">
              Selected: {uploadFile.name}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-zinc-700">Attach existing documents</span>
            <Link to="/applications" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
              Manage tracker documents
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {documents.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                You do not have any uploaded documents yet. Upload a CV above or add documents from your tracker.
              </div>
            )}
            {documents.map((document) => (
              <label key={document.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(document.id)}
                  onChange={() => toggleDocument(document.id)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">{document.file_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {document.document_type} - Uploaded {new Date(document.created_at).toLocaleString()}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isUploading || selectedDocumentIds.length === 0}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
