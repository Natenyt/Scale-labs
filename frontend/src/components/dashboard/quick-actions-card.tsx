"use client";

import Link from "next/link";
import {
  BarChart3Icon,
  BotIcon,
  PhoneIcon,
  ScrollTextIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <CardTitle className="text-sm font-medium">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            size="sm"
            className="h-auto justify-start gap-3 px-3 py-2.5 text-left"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="text-muted-foreground size-4 shrink-0" />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-muted-foreground text-[11px] font-normal">
                  {action.description}
                </span>
              </span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
