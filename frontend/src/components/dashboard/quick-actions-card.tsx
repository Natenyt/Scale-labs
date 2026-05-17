"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  BotIcon,
  PhoneIcon,
  ScrollTextIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ACTIONS = [
  {
    label: "Create agent",
    description: "Start a new voice assistant",
    href: "/agents",
    icon: BotIcon,
  },
  {
    label: "Add phone number",
    description: "Get or connect a line",
    href: "/phone-numbers",
    icon: PhoneIcon,
  },
  {
    label: "View call logs",
    description: "Recordings & transcripts",
    href: "/logs",
    icon: ScrollTextIcon,
  },
  {
    label: "Open metrics",
    description: "Deep dive on usage & cost",
    href: "/metrics",
    icon: BarChart3Icon,
  },
] as const;

export function QuickActionsCard() {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          Quick actions
        </p>
      </CardHeader>
      <CardContent className="grid gap-0.5">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group/action hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
          >
            <action.icon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 grid gap-0.5">
              <span className="text-sm font-medium leading-tight">{action.label}</span>
              <span className="text-muted-foreground text-[11px] leading-tight">
                {action.description}
              </span>
            </span>
            <ArrowUpRightIcon className="text-muted-foreground/0 group-hover/action:text-muted-foreground size-3.5 transition-colors" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
