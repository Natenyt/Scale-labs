"use client";

import * as React from "react";
import Link from "next/link";
import {
  BotIcon,
  GitBranchIcon,
  PhoneIcon,
  PlugIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
};

export function WorkspaceHealthCard({
  agents,
  workflows,
  phoneNumbers,
  integrations,
  className,
}: {
  agents: number;
  workflows: number;
  phoneNumbers: number;
  integrations: number;
  className?: string;
}) {
  const items: StatItem[] = [
    {
      label: "Voice agents",
      value: agents,
      href: "/agents",
      icon: BotIcon,
      hint: "Assistants that answer calls",
    },
    {
      label: "Workflows",
      value: workflows,
      href: "/workflow",
      icon: GitBranchIcon,
      hint: "Multi-step call flows",
    },
    {
      label: "Phone numbers",
      value: phoneNumbers,
      href: "/phone-numbers",
      icon: PhoneIcon,
      hint: "Lines for inbound & outbound",
    },
    {
      label: "Integrations",
      value: integrations,
      href: "/integrations",
      icon: PlugIcon,
      hint: "Connected tools & CRMs",
    },
  ];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Workspace</CardTitle>
        <p className="text-muted-foreground text-xs">
          What you have set up today
        </p>
      </CardHeader>
      <CardContent className="grid flex-1 gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:bg-muted/60 group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border/60"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <item.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-lg font-semibold tabular-nums">{item.value}</span>
              </span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {item.hint}
              </span>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
