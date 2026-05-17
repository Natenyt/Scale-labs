/**
 * Run backend pytest (Notion ↔ Vapi integration tests).
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const backendDir = path.join(root, "backend");
const isWin = process.platform === "win32";
const python = isWin
  ? path.join(backendDir, ".venv", "Scripts", "python.exe")
  : path.join(backendDir, ".venv", "bin", "python");

if (!fs.existsSync(python)) {
  console.error("[test:backend] Virtualenv not found:", python);
  process.exit(1);
}

const result = spawnSync(
  python,
  ["-m", "pytest", "apps/studio/tests", "-q", ...process.argv.slice(2)],
  { cwd: backendDir, stdio: "inherit" },
);

process.exit(result.status ?? 1);
