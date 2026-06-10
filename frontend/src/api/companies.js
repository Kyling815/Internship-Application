import { api } from "./client";

export async function createCompany(payload) {
  return api.post("/companies", payload);
}

export async function getMyCompany() {
  return api.get("/companies/me");
}

export async function updateCompany(companyId, payload) {
  return api.put(`/companies/${companyId}`, payload);
}
