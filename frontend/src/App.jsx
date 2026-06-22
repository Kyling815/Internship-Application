import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { CandidateApply } from "./pages/CandidateApply";
import { CandidateDashboard } from "./pages/CandidateDashboard";
import { CandidateJobApplicationDetail } from "./pages/CandidateJobApplicationDetail";
import { CandidateJobApplications } from "./pages/CandidateJobApplications";
import { CandidateJobDetail } from "./pages/CandidateJobDetail";
import { CandidateJobs } from "./pages/CandidateJobs";
import { CandidateProfile } from "./pages/CandidateProfile";
import { HrApplicationDetail } from "./pages/HrApplicationDetail";
import { HrCompany } from "./pages/HrCompany";
import { HrDashboard } from "./pages/HrDashboard";
import { HrJobApplicants } from "./pages/HrJobApplicants";
import { HrJobDetail } from "./pages/HrJobDetail";
import { HrJobEditor } from "./pages/HrJobEditor";
import { HrJobs } from "./pages/HrJobs";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleHomeRedirect } from "./routes/RoleHomeRedirect";
import { AICVMatching } from "./pages/AICVMatching";
import { ApplicationDetail } from "./pages/ApplicationDetail";
import { ApplicationsList } from "./pages/ApplicationsList";
import { CreateApplication } from "./pages/CreateApplication";
import { EditApplication } from "./pages/EditApplication";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Unauthorized } from "./pages/Unauthorized";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleHomeRedirect />} />

        <Route
          path="candidate/dashboard"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/profile"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/jobs"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/jobs/:jobId"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateJobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/jobs/:jobId/apply"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateApply />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/job-applications"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateJobApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="candidate/job-applications/:applicationId"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CandidateJobApplicationDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="applications"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <ApplicationsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="applications/new"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <CreateApplication />
            </ProtectedRoute>
          }
        />
        <Route
          path="applications/ai-cv-matching"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <AICVMatching />
            </ProtectedRoute>
          }
        />
        <Route
          path="applications/:id"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <ApplicationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="applications/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["candidate", "admin"]}>
              <EditApplication />
            </ProtectedRoute>
          }
        />

        <Route
          path="hr/dashboard"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/company"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrCompany />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/jobs"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/jobs/new"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrJobEditor mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/jobs/:jobId"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrJobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/jobs/:jobId/edit"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrJobEditor mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/jobs/:jobId/applicants"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrJobApplicants />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/applications/:applicationId"
          element={
            <ProtectedRoute allowedRoles={["hr", "admin"]}>
              <HrApplicationDetail />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
