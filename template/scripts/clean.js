// @ts-check

import fs from "node:fs/promises";
import { URL, fileURLToPath } from "node:url";

const outputPath = new URL("../dist", import.meta.url);

console.log(`Removing: ${fileURLToPath(outputPath)}`);
await fs.rm(outputPath, { recursive: true, force: true });
