import type { NextConfig } from "next";

/** Hostnames allowed to load Next dev assets (HMR) when using ngrok or similar tunnels. */
function devAllowedOrigins(): string[] {
  const hosts = new Set<string>([
    "localhost:3000",
    "127.0.0.1:3000",
    // Scale Labs public dev tunnel (update via NEXT_PUBLIC_DEV_ORIGIN when ngrok URL changes)
    "blowzily-glossological-geraldine.ngrok-free.dev",
  ]);
  const raw = process.env.NEXT_PUBLIC_DEV_ORIGIN?.trim();
  if (raw) {
    try {
      const u = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
      hosts.add(u.host);
    } catch {
      const host = raw.replace(/^https?:\/\//, "").split("/")[0];
      if (host) hosts.add(host);
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins(),
  /** Keep trailing slashes on /api/v1/* (Django APPEND_SLASH). Proxy is app/api/v1/[...path]/route.ts */
  skipTrailingSlashRedirect: true,
  experimental: {
    /**
     * Static generation / export workers. Each worker is a full Node isolate;
     * on high-core PCs the default can spawn enough processes to exhaust RAM.
     */
    cpus: 1,
    /** Run webpack in the main process instead of a child worker (lower peak RAM). */
    webpackBuildWorker: false,
    /** Prefer a smaller webpack heap footprint; slightly slower compiles. */
    webpackMemoryOptimizations: true,
    /** Avoid compiling server + edge in parallel (saves RAM during `next build`). */
    parallelServerCompiles: false,
    /** Avoid parallel build-trace collection (saves RAM during `next build`). */
    parallelServerBuildTraces: false,
  },
};

export default nextConfig;
