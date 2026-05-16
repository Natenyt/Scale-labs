import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
