import { redirect } from "next/navigation";
import { loadPreferences } from "@/lib/data/load";
import { PreferenceForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const prefs = await loadPreferences();
  if (!prefs) redirect("/");
  return (
    <PreferenceForm
      hearHelp={prefs.hearHelp}
      hearGather={prefs.hearGather}
      hearUpdates={prefs.hearUpdates}
      helpGiven={prefs.helpGiven}
      helpReceived={prefs.helpReceived}
      threads={prefs.threads}
    />
  );
}
