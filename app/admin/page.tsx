import { notFound, redirect } from "next/navigation";
import { AdminList } from "@/components/AdminList";
import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@/lib/data/db";
import { loadAdmin } from "@/lib/data/load";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!isAdminEmail(user.email)) notFound();
  const reports = await loadAdmin(user.email);
  return (
    <div className="group-page">
      <div className="group-shell">
        <h1>Held items</h1>
        <p className="lead">A report puts the item on hold. Restore puts it back. Remove keeps it hidden.</p>
        <AdminList reports={reports.map(({ id, targetType, reason, label }) => ({ id, targetType, reason, label }))} />
      </div>
    </div>
  );
}
