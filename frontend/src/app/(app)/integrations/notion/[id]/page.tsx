"use client";

import { use } from "react";

import { NotionConfigWizard } from "@/components/integrations/notion-config-wizard";

export default function EditNotionIntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NotionConfigWizard existingId={id} />;
}
