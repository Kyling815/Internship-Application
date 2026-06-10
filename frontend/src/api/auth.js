import { api, clearStoredToken, setStoredToken } from "./client";

export async function registerUser(payload) {
  return api.post("/auth/register", payload);
}

export async function loginUser(email, password) {
  const response = await api.post("/auth/login", { email, password });
  setStoredToken(response.data.access_token);
  return response;
}

export async function getCurrentUser() {
  return api.get("/auth/me");
}

export function logoutUser() {
  clearStoredToken();
}
