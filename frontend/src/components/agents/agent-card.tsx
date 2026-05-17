"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  BotIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { useAgents } from "@/components/agents/agents-store";
import { useIntegrations } from "@/components/integrations/integrations-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LANGUAGE_LABELS, type Agent } from "@/lib/agents/types";

function formatRelative(iso: string | null) {
  if (!iso) return "Never called";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function AgentCard({ agent }: { agent: Agent }) {
  const { duplicateAgent, deleteAgent } = useAgents();
  const { byId } = useIntegrations();
  const integration = agent.integrationId ? byId(agent.integrationId) : null;
  const language = LANGUAGE_LABELS[agent.language];
  const isLive = agent.status === "live";

  return (
    <Card className="group/agent transition-colors hover:bg-muted/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="bg-muted/60 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <BotIcon className="size-4" />
          </div>
          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/agents/${agent.id}`}
                className="truncate text-sm font-medium hover:underline underline-offset-2"
              >
                {agent.name}
              </Link>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em]",
                  isLive ? "text-emerald-400" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isLive ? "bg-emerald-400" : "bg-muted-foreground/50",
                  )}
                />
                {agent.status}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {agent.description || "No description yet."}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground -mr-1.5 -mt-1 size-7 shrink-0 opacity-0 transition-opacity group-hover/agent:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                aria-label="Open agent menu"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem asChild>
                <Link href={`/agents/${agent.id}`}>
                  <PencilIcon className="mr-2 size-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  void duplicateAgent(agent.id).then((copy) => {
                    if (copy) {
                      toast.success(`Duplicated as "${copy.name}"`);
                    }
                  })
                }
              >
                <CopyIcon className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => deleteAgent(agent.id)}
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className="border-border/50 text-muted-foreground bg-transparent font-normal"
        >
          {language.flag} {language.label}
        </Badge>
        {integration && (
          <Badge
            variant="outline"
            className="border-border/50 text-muted-foreground bg-transparent font-normal capitalize"
          >
            {integration.kind}
          </Badge>
        )}
        {agent.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="border-border/50 text-muted-foreground bg-transparent font-normal"
          >
            {tag}
          </Badge>
        ))}
      </CardContent>

      <CardFooter className="border-border/40 bg-transparent justify-between text-xs">
        <div className="text-muted-foreground flex items-center gap-2 tabular-nums">
          <span>{formatRelative(agent.lastCallAt)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{agent.minutesThisMonth}m this month</span>
        </div>
        <Link
          href={`/agents/${agent.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
        >
          Open
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}
