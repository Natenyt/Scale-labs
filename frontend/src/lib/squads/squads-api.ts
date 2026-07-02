import { apiFetch } from "@/lib/api/client";
import type { SquadGraph, SquadRow } from "@/lib/squads/types";

export async function fetchSquads(): Promise<SquadRow[]> {
  const data = await apiFetch<SquadRow[] | { results: SquadRow[] }>(
    "/api/v1/squads/",
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchSquad(id: string): Promise<SquadRow> {
  return apiFetch<SquadRow>(`/api/v1/squads/${encodeURIComponent(id)}/`);
}

export async function createSquad(input: {
  name: string;
  graph: SquadGraph;
}): Promise<SquadRow> {
  return apiFetch<SquadRow>("/api/v1/squads/", {
    method: "POST",
    json: input,
  });
}

export async function updateSquad(
  id: string,
  input: { name?: string; graph?: SquadGraph },
): Promise<SquadRow> {
  return apiFetch<SquadRow>(`/api/v1/squads/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    json: input,
  });
}

export async function deleteSquad(id: string): Promise<void> {
  await apiFetch(`/api/v1/squads/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}
