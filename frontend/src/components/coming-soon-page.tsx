import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
  eyebrow = "Soon",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  headline: string;
  body: string;
  links?: ComingSoonLink[];
  eyebrow?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="border-border/40 bg-card/30 flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
        <div className="bg-muted/60 flex size-12 items-center justify-center rounded-xl">
          <Icon className="text-muted-foreground size-5" aria-hidden />
        </div>
        <div className="grid max-w-md gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-sm font-medium">{headline}</p>
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.12em]">
              Coming soon
            </span>
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
