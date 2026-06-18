import { PageHeader } from "@/components/DashboardShell";
import { ExportPanel } from "@/app/superadmin/export/ExportPanel";

export default function ExportPage() {
  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Export" description="Download owner-friendly operational reports." />
      <ExportPanel />
    </>
  );
}
