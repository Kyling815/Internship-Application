import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
export const TOKEN_KEY = "internship_tracker_token";
export const AUTH_EXPIRED_EVENT = "internship_tracker_auth_expired";

export const api = axios.create({
  baseURL: API_BASE_URL
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function resolveApiUrl(value) {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && getStoredToken()) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (error?.response?.status === 401) {
    return "Your session expired. Please sign in again.";
  }
  if (error?.response?.status === 403) {
    return "You do not have permission to do that.";
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const location = Array.isArray(item?.loc) ? item.loc.at(-1) : null;
        return location ? `${location}: ${item?.msg || "Invalid value"}` : item?.msg || "Invalid request";
      })
      .join(". ");
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string") {
    return detail.message;
  }
  return error?.message || "Something went wrong";
}
