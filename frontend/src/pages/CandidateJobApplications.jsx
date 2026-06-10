import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getCandidateJobApplications } from "../api/candidate";
import { getErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { StatusBadge } from "../components/StatusBadge";

export function CandidateJobApplications() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      setError("");
      try {
        const response = await getCandidateJobApplications();
        setApplications(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Submitted job applications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Follow HR status updates for the jobs you have applied to.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-5 text-sm text-zinc-500">Loading submitted applications</p>
        ) : applications.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No job applications submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-950">{application.job_posting.company.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{application.job_posting.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(application.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/candidate/job-applications/${application.id}`}
                        className="inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
