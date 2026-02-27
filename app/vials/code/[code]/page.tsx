import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function VialCodeRedirect({ params }: Props) {
  const { code } = await params;
  const sql = getDb();

  // Look up vial by code
  const rows = await sql`
    SELECT id FROM vials WHERE vial_code = ${code} LIMIT 1
  `;

  if (rows.length > 0) {
    redirect(`/vials/${rows[0].id}`);
  }

  // If not found, redirect to home with error
  redirect("/?error=vial_not_found");
}
