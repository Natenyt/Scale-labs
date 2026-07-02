"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon, UsersIcon } from "lucide-react";

import { SquadBuilder } from "@/components/squads/squad-builder";
import { Button } from "@/components/ui/button";
import { useSquadQuery } from "@/lib/query/use-squads-query";

export default function SquadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: squad, isLoading, isError } = useSquadQuery(params.id);

  if (isLoading) {
    return (
      <div className="text-muted-foreground grid place-items-center py-24 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }

  if (isError || !squad) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
          <UsersIcon className="size-5" />
        </div>
        <div className="grid gap-1">
          <h2 className="text-base font-medium">Squad not found</h2>
          <p className="text-muted-foreground text-sm">
            It may have been deleted or never existed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/squads">
            <ArrowLeftIcon className="size-4" />
            Back to squads
          </Link>
        </Button>
      </div>
    );
  }

  return <SquadBuilder key={squad.id} mode="edit" squad={squad} />;
}
