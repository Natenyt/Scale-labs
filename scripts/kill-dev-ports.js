/**
 * Free common dev ports before `npm run dev`.
 * Helps avoid EADDRINUSE when a prior server process is still alive.
 */
const { execSync } = require("child_process");

const isWin = process.platform === "win32";
const ports = [3000, 8000];

function pidsOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
      const lines = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => /\sLISTENING\s/i.test(l));
      const pids = new Set();
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
      return [...pids];
    }
    const out = execSync(`lsof -ti tcp:${port}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (isWin) {
      execSync(`taskkill /F /PID ${pid}`, {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else {
      execSync(`kill -9 ${pid}`, {
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
    return true;
  } catch {
    return false;
  }
}

let killedAny = false;
for (const port of ports) {
  const pids = pidsOnPort(port);
  for (const pid of pids) {
    if (killPid(pid)) {
      killedAny = true;
      console.log(`[dev] Freed port ${port} (killed PID ${pid}).`);
    }
  }
}

if (!killedAny) {
  console.log("[dev] Ports 3000 and 8000 are already free.");
}
