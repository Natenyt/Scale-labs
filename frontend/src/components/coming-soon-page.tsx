import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ComingSoonLink = {
  label: string;
  href: string;
};

export function ComingSoonPage({
  title,
  description,
  icon: Icon,
  headline,
  body,
  links,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  headline: string;
  body: string;
  links?: ComingSoonLink[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="border-border/40 flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
          <Icon className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div className="grid max-w-md gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-sm font-medium">{headline}</p>
            <Badge
              variant="outline"
              className="text-[10px] font-medium uppercase tracking-wider"
            >
              Coming soon
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
        </div>
        {links && links.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {links.map((link) => (
              <Button key={link.href} asChild variant="outline" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
