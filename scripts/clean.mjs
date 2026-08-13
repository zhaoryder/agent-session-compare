import fs from "node:fs";
import path from "node:path";

const output = path.resolve("dist");
if (path.basename(output) !== "dist") throw new Error("Refusing to clean an unexpected output path.");
fs.rmSync(output, { recursive: true, force: true });
