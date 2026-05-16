import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionShell({
  id,
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <Card id={id} className={cn("scroll-mt-20", className)}>
      <div className="flex items-start justify-between gap-4 px-4 pt-1">
        <div className="grid gap-1">
          <h2 className="text-base font-medium tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

export function FieldRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/50 grid gap-2 border-b pb-5 last:border-0 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6",
        className,
      )}
    >
      <div className="grid gap-1">
        <label
          htmlFor={htmlFor}
          className="text-foreground text-sm font-medium"
        >
          {label}
        </label>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ToggleRow({
  icon,
  title,
  description,
  control,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/50 flex items-center justify-between gap-4 border-b py-3 last:border-0",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {description ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
