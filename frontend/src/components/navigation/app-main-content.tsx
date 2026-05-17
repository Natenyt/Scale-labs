"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { RouteLoadingForPath } from "@/components/navigation/route-loading-for-path";
import { useNavigationPending } from "@/components/navigation/navigation-pending";

/**
 * On sidebar navigation: show the target route skeleton immediately (before the page
 * chunk mounts), hide page output until the page calls completeNavigation().
 */
export function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingPath } = useNavigationPending();

  const showSkeleton = pendingPath !== null;
  const skeletonPath = pendingPath ?? pathname ?? "/dashboard";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {showSkeleton ? <RouteLoadingForPath path={skeletonPath} /> : null}
      <div
        className={showSkeleton ? "hidden" : "flex min-h-0 flex-1 flex-col"}
        aria-hidden={showSkeleton}
      >
        {children}
      </div>
    </div>
  );
}
