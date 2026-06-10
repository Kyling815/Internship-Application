import { statusClassNames } from "../constants";

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClassNames[status] || statusClassNames.Saved}`}>
      {status}
    </span>
  );
}
