import { redirect } from "next/navigation";

/** Browser voice testing lives on each agent and workflow page. */
export default function CallsPage() {
  redirect("/agents");
}
