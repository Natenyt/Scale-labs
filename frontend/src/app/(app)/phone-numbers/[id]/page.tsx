"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { toast } from "sonner";

import {
  AssignmentFields,
  type AssignmentValue,
} from "@/components/phone-numbers/assignment-fields";
import { QueryErrorCard } from "@/components/query/query-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasBackendApi } from "@/lib/api/env";
import {
  deletePhoneNumber,
  updatePhoneNumber,
  type PhoneNumberSummary,
} from "@/lib/phone-numbers/phone-numbers-api";
import {
  useInvalidatePhoneNumbers,
  usePhoneNumberQuery,
} from "@/lib/query/use-phone-numbers-query";

function assignmentFromRow(row: PhoneNumberSummary): AssignmentValue {
  if (row.assignedType === "agent" && row.assignAgentId) {
    return {
      mode: "agent",
      agentId: row.assignAgentId,
      workflowId: "",
    };
  }
  if (row.assignedType === "workflow" && row.assignWorkflowId) {
    return {
      mode: "workflow",
      agentId: "",
      workflowId: row.assignWorkflowId,
    };
  }
  return { mode: "none", agentId: "", workflowId: "" };
}

function PhoneNumberSettingsForm({
  row,
  phoneId,
}: {
  row: PhoneNumberSummary;
  phoneId: string;
}) {
  const router = useRouter();
  const { invalidateAll, invalidateDetail, removeDetail } =
    useInvalidatePhoneNumbers();
  const [name, setName] = React.useState(() => row.name);
  const [assignment, setAssignment] = React.useState<AssignmentValue>(() =>
    assignmentFromRow(row),
  );
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload: Parameters<typeof updatePhoneNumber>[1] = {
        name: name.trim() || row.name,
      };
      if (assignment.mode === "none") {
        payload.clearAssignment = true;
      } else if (assignment.mode === "agent" && assignment.agentId) {
        payload.assignAgentId = assignment.agentId;
      } else if (assignment.mode === "workflow" && assignment.workflowId) {
        payload.assignWorkflowId = assignment.workflowId;
      }
      await updatePhoneNumber(phoneId, payload);
      await invalidateDetail(phoneId);
      await invalidateAll();
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await deletePhoneNumber(phoneId);
      removeDetail(phoneId);
      await invalidateAll();
      toast.success("Phone number deleted");
      router.push("/phone-numbers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Friendly name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <AssignmentFields
            value={assignment}
            onChange={setAssignment}
            disabled={saving}
          />
          <p className="text-muted-foreground text-[11px]">
            To reassign, pick an agent or workflow above. Choose &quot;Nobody yet&quot; to
            clear who answers.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this number?</DialogTitle>
            <DialogDescription>
              {row.number} will be removed from your voice provider.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhoneNumberDetailBody({ phoneId }: { phoneId: string }) {
  const { data: row, isPending, isLoading, error } = usePhoneNumberQuery(phoneId);

  const pageReady = !hasBackendApi() || Boolean(row) || Boolean(error);
  useCompleteNavigationWhenReady(pageReady);

  if (!hasBackendApi()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (!pageReady && (isPending || isLoading)) {
    return null;
  }

  if (error || !row) {
    return (
      <div className="grid gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/phone-numbers">
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </Button>
        <QueryErrorCard
          message={error instanceof Error ? error.message : "Not found"}
        />
      </div>
    );
  }

  return (
    <div className="grid max-w-lg gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
        <Link href="/phone-numbers">
          <ArrowLeftIcon className="size-4" />
          Phone numbers
        </Link>
      </Button>

      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{row.name}</h1>
        <p className="font-mono text-lg tabular-nums">{row.number}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{row.providerLabel}</Badge>
          <Badge variant="outline">{row.statusLabel}</Badge>
        </div>
      </div>

      <PhoneNumberSettingsForm key={row.id} row={row} phoneId={phoneId} />
    </div>
  );
}

export default function PhoneNumberDetailPage() {
  const params = useParams<{ id: string }>();
  const phoneId = decodeURIComponent(params.id ?? "");
  if (!phoneId) {
    return <p className="text-sm">Missing phone number.</p>;
  }
  return <PhoneNumberDetailBody phoneId={phoneId} />;
}
