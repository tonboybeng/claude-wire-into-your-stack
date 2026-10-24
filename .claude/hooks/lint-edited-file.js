const { execFileSync } = require("node:child_process");
const path = require("node:path");

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const eslintBin = path.join(
  projectDir,
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);

let input = "";

process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const filePath = JSON.parse(input).tool_input?.file_path;

  if (!filePath) return;

  const relative = path.relative(projectDir, filePath);

  if (
    !filePath.endsWith(".js") ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    filePath.includes("node_modules")
  )
    return;

  try {
    execFileSync(
      process.execPath,
      [eslintBin, "--max-warnings", "0", filePath],
      {
        cwd: projectDir,
        stdio: "pipe",
      },
    );
  } catch (err) {
    process.stderr.write(
      `ESLint found problems in ${filePath}:\n${err.stdout}${err.stderr}`,
    );
    process.exit(2);
  }
});
