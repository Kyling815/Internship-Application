import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { createHrJob, getHrJob, updateHrJob } from "../api/hr";
import { Alert } from "../components/Alert";
import { JobPostingForm } from "../components/JobPostingForm";

export function HrJobEditor({ mode = "create" }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit") return;

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
  }, [jobId, mode]);

  async function handleSubmit(payload) {
    setError("");
    setIsSaving(true);
    try {
      const response = mode === "edit"
        ? await updateHrJob(jobId, payload)
        : await createHrJob(payload);
      navigate(`/hr/jobs/${response.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading job editor</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">
          {mode === "edit" ? "Edit job posting" : "New job posting"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Define the internship details candidates will review before applying.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <JobPostingForm
        initialValues={job}
        onSubmit={handleSubmit}
        isLoading={isSaving}
        submitLabel={mode === "edit" ? "Save job" : "Create job"}
      />
    </div>
  );
}
