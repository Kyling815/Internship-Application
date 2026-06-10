import { api } from "./client";

export async function getHrDashboard() {
  return api.get("/hr/dashboard");
}

export async function getHrJobs() {
  return api.get("/hr/jobs");
}

export async function getHrJob(jobId) {
  return api.get(`/hr/jobs/${jobId}`);
}

export async function createHrJob(payload) {
  return api.post("/hr/jobs", payload);
}

export async function updateHrJob(jobId, payload) {
  return api.put(`/hr/jobs/${jobId}`, payload);
}

export async function deleteHrJob(jobId) {
  return api.delete(`/hr/jobs/${jobId}`);
}

export async function updateHrJobStatus(jobId, status) {
  return api.patch(`/hr/jobs/${jobId}/status`, { status });
}

export async function getHrJobApplications(jobId) {
  return api.get(`/hr/jobs/${jobId}/applications`);
}

export async function getHrApplication(applicationId) {
  return api.get(`/hr/applications/${applicationId}`);
}

export async function updateHrApplicationStatus(applicationId, payload) {
  return api.patch(`/hr/applications/${applicationId}/status`, payload);
}

export async function getHrDocumentDownloadUrl(documentId) {
  return api.get(`/hr/documents/${documentId}/download-url`);
}
