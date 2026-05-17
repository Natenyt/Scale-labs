"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { AddPhoneNumberDialog } from "@/components/phone-numbers/add-phone-number-dialog";
import { QueryErrorCard } from "@/components/query/query-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasBackendApi } from "@/lib/api/env";
import { deletePhoneNumber } from "@/lib/phone-numbers/phone-numbers-api";
import {
  useInvalidatePhoneNumbers,
  usePhoneNumbersQuery,
} from "@/lib/query/use-phone-numbers-query";
import { cn } from "@/lib/utils";

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "secondary";
  if (status === "blocked") return "destructive";
  return "outline";
}

function PhoneNumbersList({
  initialAgentId,
  onAddClick,
  onReadyChange,
}: {
  initialAgentId?: string;
  onAddClick: () => void;
  onReadyChange?: (ready: boolean) => void;
}) {
  const { data: rows = [], isPending, isLoading, isFetching, error } =
    usePhoneNumbersQuery();

  const ready = !hasBackendApi() || Boolean(error) || (!isPending && !isLoading);

  React.useLayoutEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);
  const { invalidateAll, removeDetail } = useInvalidatePhoneNumbers();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deletePhoneNumber(deleteId);
      toast.success("Phone number removed");
      removeDetail(deleteId);
      setDeleteId(null);
      await invalidateAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  if (!hasBackendApi()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (!ready && (isPending || isLoading)) {
    return null;
  }

  if (error) {
    return (
      <QueryErrorCard
        message={
          error instanceof Error ? error.message : "Could not load phone numbers"
        }
      />
    );
  }

  if (rows.length === 0) {
    return (
      <Card size="sm" className="border-dashed">
        <CardContent className="grid gap-4 py-12 text-center">
          <PhoneIcon className="text-muted-foreground mx-auto size-10" />
          <div className="grid gap-1">
            <p className="font-medium">No phone numbers yet</p>
            <p className="text-muted-foreground text-sm">
              Get a new number in a few clicks, or connect a line you already have
              from Twilio.
            </p>
          </div>
          <Button type="button" size="sm" onClick={onAddClick}>
            <PlusIcon className="size-4" />
            Add phone number
          </Button>
          {initialAgentId ? (
            <p className="text-muted-foreground text-xs">
              Tip: you opened this from an agent — we will pre-select them when you add
              a number.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
          isFetching && "opacity-80 transition-opacity",
        )}
      >
        {rows.map((row) => (
          <Card key={row.id} size="sm" className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0 grid gap-1">
                <CardTitle className="truncate text-base">{row.name}</CardTitle>
                <p className="font-mono text-sm tabular-nums">{row.number}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-8 shrink-0 px-0">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/phone-numbers/${encodeURIComponent(row.id)}`}>
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="mt-auto grid gap-3 pt-0">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {row.providerLabel}
                </Badge>
                <Badge variant={statusVariant(row.status)} className="text-[10px]">
                  {row.statusLabel}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Answers with:{" "}
                <span className="text-foreground">{row.assignedTo}</span>
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/phone-numbers/${encodeURIComponent(row.id)}`}>
                  Manage
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this phone number?</DialogTitle>
            <DialogDescription>
              This removes the number from your voice provider. You cannot undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PhoneNumbersPage() {
  const searchParams = useSearchParams();
  const initialAgentId = searchParams.get("agent")?.trim() || undefined;
  const { refetch, isFetching } = usePhoneNumbersQuery();
  const [addOpen, setAddOpen] = React.useState(false);
  const [contentReady, setContentReady] = React.useState(false);
  const { invalidateAll } = useInvalidatePhoneNumbers();

  useCompleteNavigationWhenReady(contentReady);

  const onReadyChange = React.useCallback((ready: boolean) => {
    setContentReady(ready);
  }, []);

  if (!contentReady) {
    return (
      <PhoneNumbersList
        initialAgentId={initialAgentId}
        onAddClick={() => setAddOpen(true)}
        onReadyChange={onReadyChange}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Phone numbers</h1>
          <p className="text-muted-foreground text-sm">
            Numbers that receive and place calls for your agents and workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCwIcon
              className={cn("size-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Add number
          </Button>
        </div>
      </div>

      <PhoneNumbersList
        initialAgentId={initialAgentId}
        onAddClick={() => setAddOpen(true)}
        onReadyChange={onReadyChange}
      />

      <AddPhoneNumberDialog
        key={addOpen ? `open-${initialAgentId ?? ""}` : "closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
        initialAgentId={initialAgentId}
        onCreated={() => void invalidateAll()}
      />
    </div>
  );
}
