/**
 * Start Django with the backend/.venv interpreter (cross-platform).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const backendDir = path.join(root, "backend");
const isWin = process.platform === "win32";
const python = isWin
  ? path.join(backendDir, ".venv", "Scripts", "python.exe")
  : path.join(backendDir, ".venv", "bin", "python");

if (!fs.existsSync(python)) {
  console.error("[django] Virtualenv not found:", python);
  console.error(
    "[django] Create it:\n  cd backend\n  python -m venv .venv\n  .venv\\Scripts\\pip install -r requirements.txt   (Windows)\n  .venv/bin/pip install -r requirements.txt       (macOS/Linux)",
  );
  process.exit(1);
}

const bindHost = process.env.BACKEND_HOST || "0.0.0.0";
const bindPort = process.env.BACKEND_PORT || "8000";
const child = spawn(python, ["manage.py", "runserver", `${bindHost}:${bindPort}`], {
  cwd: backendDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("[django]", err.message);
  process.exit(1);
});
