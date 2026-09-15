import { requireCompany } from "@/lib/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, company } = await requireCompany();

  return (
    <DashboardShell companyName={company.name} userName={user.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
