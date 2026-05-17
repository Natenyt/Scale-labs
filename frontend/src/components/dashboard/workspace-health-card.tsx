"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BotIcon,
  GitBranchIcon,
  PhoneIcon,
  PlugIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
    { label: "Voice agents", value: agents, href: "/agents", icon: BotIcon },
    { label: "Workflows", value: workflows, href: "/workflow", icon: GitBranchIcon },
    { label: "Phone numbers", value: phoneNumbers, href: "/phone-numbers", icon: PhoneIcon },
    { label: "Integrations", value: integrations, href: "/integrations", icon: PlugIcon },
  ];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          Workspace
        </p>
        <p className="text-foreground text-sm font-medium">Configured today</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="divide-border/40 -mx-1 flex flex-1 flex-col divide-y">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group/row hover:bg-muted/40 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
              >
                <span className="text-muted-foreground flex size-7 shrink-0 items-center justify-center">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-base font-medium tabular-nums">
                    {item.value}
                  </span>
                  <ArrowUpRightIcon className="text-muted-foreground/0 group-hover/row:text-muted-foreground size-3.5 transition-colors" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
