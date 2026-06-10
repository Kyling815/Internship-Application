import { api } from "./client";

export async function uploadApplicationDocument(applicationId, formData) {
  return api.post(`/applications/${applicationId}/documents`, formData);
}

export async function uploadCandidateDocument(formData) {
  return api.post("/candidate/documents", formData);
}

export async function listApplicationDocuments(applicationId) {
  return api.get(`/applications/${applicationId}/documents`);
}

export async function getDocumentDownloadUrl(documentId) {
  return api.get(`/documents/${documentId}/download-url`);
}

export async function deleteDocument(documentId) {
  return api.delete(`/documents/${documentId}`);
}
