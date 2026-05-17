"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ClockIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";

import { useIntegrations } from "@/components/integrations/integrations-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { mapDjangoNotionIntegration, type DjangoNotion } from "@/lib/api/django";
import { hasBackendApi } from "@/lib/api/env";
import { cn } from "@/lib/utils";
import { sanitizeKey } from "@/lib/integrations/sanitize";
import { resyncNotionTools } from "@/lib/integrations/notion/sync-client";
import { upsertNotionIntegration } from "@/lib/integrations/store";
import type {
  FieldMapping,
  NotionIntegration,
} from "@/lib/integrations/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TestResponse = {
  ok: true;
  user: { id: string; name: string | null; type: string };
  workspace: { name: string | null } | null;
};

type DatabaseHit = {
  dataSourceId: string;
  databaseId: string;
  title: string;
  url: string | null;
  lastEditedTime: string | null;
};

type SchemaResponse = {
  ok: true;
  dataSourceId: string;
  databaseId: string | null;
  title: string;
  properties: FieldMapping[];
};

type Step = "token" | "database" | "mapping";

// ---------------------------------------------------------------------------
// Public wrapper — handles hydration for the edit route
// ---------------------------------------------------------------------------

export function NotionConfigWizard({ existingId }: { existingId?: string }) {
  const { byId, ready } = useIntegrations();

  if (!existingId) {
    return <NotionConfigWizardCore key="new" existing={undefined} />;
  }

  if (!ready) {
    return <WizardSkeleton />;
  }

  const existing = byId(existingId) as NotionIntegration | undefined;
  if (!existing) {
    return <NotFound />;
  }

  return <NotionConfigWizardCore key={existing.id} existing={existing} />;
}

function WizardSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 pt-2">
      <div className="bg-muted/40 h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted/40 h-64 animate-pulse rounded-xl" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid place-items-center gap-3 py-20 text-center">
      <p className="text-sm font-medium">Integration not found</p>
      <Button asChild variant="outline">
        <Link href="/integrations">
          <ArrowLeftIcon className="size-4" />
          Back to integrations
        </Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Core wizard
// ---------------------------------------------------------------------------

function NotionConfigWizardCore({
  existing,
}: {
  existing: NotionIntegration | undefined;
}) {
  const router = useRouter();
  const {
    createNotion,
    updateNotion,
    notionRemainingSlots,
    setSyncStatus,
    setVapiTools,
  } = useIntegrations();

  const isEdit = !!existing;
  const [step, setStep] = React.useState<Step>(isEdit ? "mapping" : "token");

  // Step 1 — token + label (lazy init from existing record)
  const [label, setLabel] = React.useState(() => existing?.label ?? "");
  const [token, setToken] = React.useState(() => existing?.token ?? "");
  const [showToken, setShowToken] = React.useState(false);
  const [tokenStatus, setTokenStatus] = React.useState<
    | { kind: "idle" }
    | { kind: "testing" }
    | { kind: "ok"; workspace: string | null; userName: string | null }
    | { kind: "error"; message: string }
  >(() => (existing ? { kind: "ok", workspace: null, userName: null } : { kind: "idle" }));

  // Step 2 — database picker
  const [dbQuery, setDbQuery] = React.useState("");
  const [dbList, setDbList] = React.useState<DatabaseHit[]>([]);
  const [dbLoading, setDbLoading] = React.useState(false);
  const [dbError, setDbError] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<DatabaseHit | null>(() =>
    existing
      ? {
          dataSourceId: existing.dataSourceId,
          databaseId: existing.databaseId,
          title: existing.databaseTitle,
          url: null,
          lastEditedTime: null,
        }
      : null,
  );

  // Step 3 — mapping
  const [fieldMap, setFieldMap] = React.useState<FieldMapping[]>(
    () => existing?.fieldMap ?? [],
  );
  const [schemaLoading, setSchemaLoading] = React.useState(false);
  const [schemaError, setSchemaError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ---------------- handlers ----------------

  const testConnection = async () => {
    setTokenStatus({ kind: "testing" });
    try {
      const res = await fetch("/api/integrations/notion/test", {
        headers: { "X-Notion-Token": token.trim() },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setTokenStatus({
          kind: "error",
          message: body.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as TestResponse;
      setTokenStatus({
        kind: "ok",
        workspace: data.workspace?.name ?? null,
        userName: data.user.name,
      });
    } catch (err) {
      setTokenStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const loadDatabases = async (q: string) => {
    if (!token) return;
    setDbLoading(true);
    setDbError(null);
    try {
      const res = await fetch(
        `/api/integrations/notion/databases${q ? `?query=${encodeURIComponent(q)}` : ""}`,
        { headers: { "X-Notion-Token": token.trim() } },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDbError(body.error ?? `HTTP ${res.status}`);
        setDbList([]);
        return;
      }
      const data = (await res.json()) as { items: DatabaseHit[] };
      setDbList(data.items);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDbLoading(false);
    }
  };

  const goToDatabaseStep = async () => {
    setStep("database");
    if (dbList.length === 0) {
      await loadDatabases("");
    }
  };

  const loadSchema = async (dataSourceId: string) => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetch(
        `/api/integrations/notion/databases/${dataSourceId}/schema`,
        { headers: { "X-Notion-Token": token.trim() } },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSchemaError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as SchemaResponse;
      setFieldMap((prev) => {
        if (!prev || prev.length === 0) return data.properties;
        const byPropertyId = new Map(prev.map((p) => [p.notionPropertyId, p]));
        return data.properties.map((next) => {
          const old = byPropertyId.get(next.notionPropertyId);
          if (!old) return next;
          return {
            ...next,
            key: old.key,
            description: old.description,
            loadIntoContext: old.loadIntoContext,
          };
        });
      });
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSchemaLoading(false);
    }
  };

  const advanceToMapping = async (db: DatabaseHit) => {
    setChosen(db);
    setStep("mapping");
    await loadSchema(db.dataSourceId);
  };

  const save = async () => {
    if (!chosen) return;
    if (!label.trim()) {
      toast.error("Give this connection a label so you can tell it apart.");
      return;
    }
    setSaving(true);
    try {
      let record: NotionIntegration;
      if (hasBackendApi()) {
        if (existing) {
          await apiFetch(`/api/v1/integrations/notion/${existing.id}/`, {
            method: "PATCH",
            json: {
              label: label.trim(),
              data_source_id: chosen.dataSourceId,
              database_id: chosen.databaseId,
              field_mappings: fieldMap,
              ...(token.trim() ? { token: token.trim() } : {}),
            },
          });
          const patch: Partial<NotionIntegration> = {
            label: label.trim(),
            token: "",
            databaseId: chosen.databaseId,
            dataSourceId: chosen.dataSourceId,
            databaseTitle: chosen.title,
            fieldMap,
            syncStatus: "syncing",
          };
          updateNotion(existing.id, patch);
          record = { ...existing, ...patch } as NotionIntegration;
          toast.success("Notion connection updated");
        } else {
          const created = await apiFetch<DjangoNotion>(
            "/api/v1/integrations/notion/",
            {
              method: "POST",
              json: {
                label: label.trim(),
                data_source_id: chosen.dataSourceId,
                database_id: chosen.databaseId,
                field_mappings: fieldMap,
                token: token.trim(),
              },
            },
          );
          record = {
            ...mapDjangoNotionIntegration(created),
            databaseTitle: chosen.title,
            syncStatus: "syncing",
          };
          upsertNotionIntegration(record);
          toast.success("Notion connection added");
        }
      } else if (existing) {
        const patch: Partial<NotionIntegration> = {
          label: label.trim(),
          token: token.trim(),
          databaseId: chosen.databaseId,
          dataSourceId: chosen.dataSourceId,
          databaseTitle: chosen.title,
          fieldMap,
          syncStatus: "syncing",
        };
        updateNotion(existing.id, patch);
        record = { ...existing, ...patch } as NotionIntegration;
        toast.success("Notion connection updated");
      } else {
        record = createNotion({
          label: label.trim(),
          token: token.trim(),
          databaseId: chosen.databaseId,
          dataSourceId: chosen.dataSourceId,
          databaseTitle: chosen.title,
          fieldMap,
          syncStatus: "syncing",
        });
        toast.success("Notion connection added");
      }

      await resyncNotionTools(record, { setSyncStatus, setVapiTools });
      router.push("/integrations");
    } finally {
      setSaving(false);
    }
  };

  const stepNumber =
    isEdit ? 1 : step === "token" ? 1 : step === "database" ? 2 : 3;
  const totalSteps = isEdit ? 1 : 3;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 pt-2">
      <Header
        isEdit={isEdit}
        currentLabel={existing?.label}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
      />

      {!isEdit && (
        <StepTabs
          step={step}
          completed={{
            token: tokenStatus.kind === "ok",
            database: !!chosen,
          }}
          onJump={(s) => {
            if (s === "token") setStep("token");
            else if (s === "database" && tokenStatus.kind === "ok")
              void goToDatabaseStep();
            else if (s === "mapping" && chosen) setStep("mapping");
          }}
        />
      )}

      {step === "token" && (
        <TokenStep
          label={label}
          onLabel={setLabel}
          token={token}
          onToken={(v) => {
            setToken(v);
            setTokenStatus({ kind: "idle" });
          }}
          showToken={showToken}
          onToggleShow={() => setShowToken((s) => !s)}
          status={tokenStatus}
          onTest={testConnection}
          onNext={goToDatabaseStep}
          remainingSlots={notionRemainingSlots}
        />
      )}

      {step === "database" && (
        <DatabaseStep
          query={dbQuery}
          onQuery={setDbQuery}
          onSearch={() => loadDatabases(dbQuery)}
          items={dbList}
          loading={dbLoading}
          error={dbError}
          selectedId={chosen?.dataSourceId ?? null}
          onPick={setChosen}
          onBack={() => setStep("token")}
          onNext={() => chosen && advanceToMapping(chosen)}
        />
      )}

      {step === "mapping" && chosen && (
        <MappingStep
          label={label}
          onLabel={setLabel}
          chosen={chosen}
          fields={fieldMap}
          onFields={setFieldMap}
          loading={schemaLoading}
          error={schemaError}
          onReload={() => loadSchema(chosen.dataSourceId)}
          onBack={isEdit ? undefined : () => setStep("database")}
          onSave={save}
          saving={saving}
          isEdit={isEdit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header / tabs
// ---------------------------------------------------------------------------

function Header({
  isEdit,
  currentLabel,
  stepNumber,
  totalSteps,
}: {
  isEdit: boolean;
  currentLabel: string | undefined;
  stepNumber: number;
  totalSteps: number;
}) {
  return (
    <div className="grid gap-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5">
        <Link href="/integrations">
          <ArrowLeftIcon className="size-3.5" />
          All integrations
        </Link>
      </Button>
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-200/10 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-200/20">
          N
        </div>
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? currentLabel ?? "Notion connection" : "Add Notion connection"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit
              ? "Edit the mapping or refresh the schema."
              : `Step ${stepNumber} of ${totalSteps} — connect a Notion database for your agents to read from.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function StepTabs({
  step,
  completed,
  onJump,
}: {
  step: Step;
  completed: { token: boolean; database: boolean };
  onJump: (s: Step) => void;
}) {
  const steps: { id: Step; label: string }[] = [
    { id: "token", label: "Token" },
    { id: "database", label: "Database" },
    { id: "mapping", label: "Mapping" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const active = s.id === step;
        const done =
          (s.id === "token" && completed.token) ||
          (s.id === "database" && completed.database) ||
          (s.id === "mapping" && false);
        const reachable =
          s.id === "token" ||
          (s.id === "database" && completed.token) ||
          (s.id === "mapping" && completed.database);
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(s.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                active
                  ? "border-foreground/40 bg-accent text-foreground"
                  : reachable
                    ? "border-input text-muted-foreground hover:bg-accent/40"
                    : "border-input/50 text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2Icon className="size-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <ArrowRightIcon className="text-muted-foreground/40 size-3" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Token
// ---------------------------------------------------------------------------

function TokenStep({
  label,
  onLabel,
  token,
  onToken,
  showToken,
  onToggleShow,
  status,
  onTest,
  onNext,
  remainingSlots,
}: {
  label: string;
  onLabel: (v: string) => void;
  token: string;
  onToken: (v: string) => void;
  showToken: boolean;
  onToggleShow: () => void;
  status:
    | { kind: "idle" }
    | { kind: "testing" }
    | { kind: "ok"; workspace: string | null; userName: string | null }
    | { kind: "error"; message: string };
  onTest: () => void;
  onNext: () => void;
  remainingSlots: number;
}) {
  const canTest = token.trim().length > 0 && status.kind !== "testing";
  const canContinue = status.kind === "ok" && label.trim().length > 0;

  return (
    <Card>
      <CardContent className="grid gap-5 pt-6">
        <div className="grid gap-2">
          <Label htmlFor="notion-label">Connection label</Label>
          <Input
            id="notion-label"
            placeholder="e.g. Sales CRM"
            value={label}
            onChange={(e) => onLabel(e.target.value)}
            maxLength={60}
          />
          <p className="text-muted-foreground text-xs">
            Just a friendly name. You can keep up to{" "}
            {remainingSlots > 0 ? `${remainingSlots} more` : "0 more"} Notion connections on this plan.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notion-token">Notion internal-integration token</Label>
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <KeyRoundIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                id="notion-token"
                type={showToken ? "text" : "password"}
                placeholder="secret_..."
                value={token}
                onChange={(e) => onToken(e.target.value)}
                className="pl-8 pr-9 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={onToggleShow}
                className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={onTest}
              disabled={!canTest}
              className="gap-1.5"
            >
              {status.kind === "testing" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              Test
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Create one at{" "}
            <a
              href="https://www.notion.so/profile/integrations"
              target="_blank"
              rel="noreferrer"
              className="text-foreground inline-flex items-center gap-1 underline"
            >
              notion.so/profile/integrations
              <ExternalLinkIcon className="size-3" />
            </a>
            , then share the target database with the integration.
          </p>
        </div>

        {status.kind === "ok" && (
          <TokenOk
            workspace={status.workspace}
            userName={status.userName}
          />
        )}
        {status.kind === "error" && <TokenError message={status.message} />}

        <div className="flex items-center justify-end">
          <Button onClick={onNext} disabled={!canContinue} className="gap-1.5">
            Continue
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TokenOk({
  workspace,
  userName,
}: {
  workspace: string | null;
  userName: string | null;
}) {
  return (
    <div className="border-emerald-500/30 bg-emerald-500/5 grid gap-1 rounded-lg border px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <CheckCircle2Icon className="size-4" />
        Connected
      </div>
      <p className="text-muted-foreground text-xs">
        {workspace ? `Workspace: ${workspace}.` : "Token is valid."}
        {userName ? ` Bot user: ${userName}.` : ""}
      </p>
    </div>
  );
}

function TokenError({ message }: { message: string }) {
  return (
    <div className="border-destructive/40 bg-destructive/10 grid gap-1 rounded-lg border px-3 py-2.5">
      <div className="text-destructive flex items-center gap-2 text-sm font-medium">
        <CircleAlertIcon className="size-4" />
        Connection failed
      </div>
      <p className="text-muted-foreground text-xs">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Database picker
// ---------------------------------------------------------------------------

function DatabaseStep({
  query,
  onQuery,
  onSearch,
  items,
  loading,
  error,
  selectedId,
  onPick,
  onBack,
  onNext,
}: {
  query: string;
  onQuery: (v: string) => void;
  onSearch: () => void;
  items: DatabaseHit[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onPick: (db: DatabaseHit) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-5 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          >
            Use existing
          </Badge>
          <Badge variant="outline" className="text-muted-foreground/60">
            Create new
          </Badge>
        </div>

        <form
          className="flex items-stretch gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search by database name..."
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" type="submit" className="gap-1.5">
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
            )}
            Search
          </Button>
        </form>

        {error && (
          <div className="border-destructive/40 bg-destructive/10 rounded-lg border px-3 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          {loading && items.length === 0 ? (
            <DatabaseSkeleton />
          ) : items.length === 0 ? (
            <NoDatabases />
          ) : (
            items.map((db) => (
              <button
                key={db.dataSourceId}
                type="button"
                onClick={() => onPick(db)}
                className={cn(
                  "border-input flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                  "hover:bg-accent/40",
                  selectedId === db.dataSourceId &&
                    "border-foreground/40 bg-accent/40 ring-foreground/10 ring-1",
                )}
              >
                <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 items-center justify-center rounded-lg">
                  <DatabaseIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {db.title || "Untitled"}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span className="truncate font-mono">{db.databaseId}</span>
                    {db.lastEditedTime && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <ClockIcon className="size-3" />
                        <span>Edited {formatRelative(db.lastEditedTime)}</span>
                      </>
                    )}
                  </div>
                </div>
                {selectedId === db.dataSourceId && (
                  <CheckCircle2Icon className="mt-0.5 size-5 text-emerald-400" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-1.5">
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!selectedId} className="gap-1.5">
            Continue
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-border/40 h-16 animate-pulse rounded-lg border"
        />
      ))}
    </>
  );
}

function NoDatabases() {
  return (
    <div className="border-border/40 grid place-items-center gap-1 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">No databases yet</p>
      <p className="text-muted-foreground max-w-md text-xs">
        Share at least one Notion database with the integration in Notion
        (... menu → Connections → your integration), then search again.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Mapping
// ---------------------------------------------------------------------------

function MappingStep({
  label,
  onLabel,
  chosen,
  fields,
  onFields,
  loading,
  error,
  onReload,
  onBack,
  onSave,
  saving,
  isEdit,
}: {
  label: string;
  onLabel: (v: string) => void;
  chosen: DatabaseHit;
  fields: FieldMapping[];
  onFields: (f: FieldMapping[]) => void;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onBack?: () => void;
  onSave: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const updateField = (idx: number, patch: Partial<FieldMapping>) => {
    onFields(
      fields.map((f, i) =>
        i === idx
          ? {
              ...f,
              ...patch,
              key: patch.key != null ? sanitizeKey(patch.key) : f.key,
            }
          : f,
      ),
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-5 pt-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DatabaseIcon className="text-muted-foreground size-4" />
              {chosen.title || "Untitled"}
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              {chosen.databaseId}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReload}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
            Refresh schema
          </Button>
        </div>

        {isEdit && (
          <div className="grid gap-2">
            <Label htmlFor="notion-label-edit">Connection label</Label>
            <Input
              id="notion-label-edit"
              value={label}
              onChange={(e) => onLabel(e.target.value)}
              maxLength={60}
            />
          </div>
        )}

        {error && (
          <div className="border-destructive/40 bg-destructive/10 rounded-lg border px-3 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading && fields.length === 0 ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-border/40 h-20 animate-pulse rounded-lg border"
              />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No properties found on this data source.
          </p>
        ) : (
          <div className="grid gap-2">
            {fields.map((f, i) => (
              <FieldRowEditor
                key={f.notionPropertyId}
                field={f}
                onChange={(patch) => updateField(i, patch)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="gap-1.5">
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={onSave}
            disabled={saving || fields.length === 0}
            className="gap-1.5"
          >
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Save connection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRowEditor({
  field,
  onChange,
}: {
  field: FieldMapping;
  onChange: (patch: Partial<FieldMapping>) => void;
}) {
  return (
    <div className="border-border/60 grid gap-3 rounded-lg border px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {field.notionPropertyName}
          </span>
          <Badge
            variant="secondary"
            className="font-mono text-[10px] font-normal"
          >
            {field.notionType}
          </Badge>
        </div>
        <input
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          className="text-muted-foreground bg-transparent font-mono text-[11px] outline-none focus:underline"
          aria-label="Tool parameter key"
          spellCheck={false}
        />
        {field.options && field.options.length > 0 && (
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-1 text-[10px]">
            {field.options.slice(0, 6).map((o) => (
              <span key={o.id} className="bg-muted rounded px-1.5 py-0.5">
                {o.name}
              </span>
            ))}
            {field.options.length > 6 && (
              <span className="text-muted-foreground/70">
                +{field.options.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
      <Textarea
        value={field.description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={2}
        placeholder="What this column stores. Helps the agent map values."
        className="resize-none text-xs"
      />
      <label className="flex items-center gap-2 self-start text-xs">
        <Switch
          checked={field.loadIntoContext}
          onCheckedChange={(v) => onChange({ loadIntoContext: v })}
        />
        <span className="text-muted-foreground">Load into context</span>
      </label>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
