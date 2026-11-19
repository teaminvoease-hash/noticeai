import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function StagingBanner() {
  const [staging, setStaging] = useState(false);
  useEffect(() => {
    api<{ staging: boolean }>("/api/public/runtime")
      .then((r) => setStaging(r.staging))
      .catch(() => {});
  }, []);
  return staging ? (
    <div className="staging-banner" role="status">
      STAGING WORKSPACE · Use synthetic test data only · Live payments and
      outbound email are disabled.
    </div>
  ) : null;
}
