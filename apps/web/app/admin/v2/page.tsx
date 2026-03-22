import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdminV2Page() {
  redirect("/admin/v2/inbox");
}
