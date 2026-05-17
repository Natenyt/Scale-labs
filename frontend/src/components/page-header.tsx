import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="grid gap-1.5">
        {eyebrow ? (
          <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.14em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] md:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function PageHeaderEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.14em]">
      {children}
    </span>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]",
        className,
      )}
    >
      {children}
    </p>
  );
}
