import { redirect } from "next/navigation";

// Redirect old /vials/create to Settings where dose creation now lives
export default function CreateVialPage() {
  redirect("/settings");
}
