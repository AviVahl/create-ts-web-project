// @ts-check

import { fork } from "node:child_process";
import { URL, fileURLToPath } from "node:url";
import ts from "typescript";
const {
  // @ts-expect-error internal helper function
  createWatchStatusReporter,
  sys,
  createWatchCompilerHost,
  createWatchProgram,
} = ts;

const tsconfigPath = fileURLToPath(
  new URL("../tsconfig.json", import.meta.url)
);
const serverMainPath = fileURLToPath(
  new URL("./dev-server.js", import.meta.url)
);

const serverArgs = process.argv.slice(2);

/** @type import('child_process').ChildProcess | undefined */
let cliProcess = undefined;

async function refreshCliProcess() {
  if (cliProcess) {
    cliProcess.send("reload");
  } else {
    cliProcess = fork(serverMainPath, serverArgs, {
      stdio: "inherit",
    });
  }
}

/** @type import('typescript').WatchStatusReporter */
const originalStatusReporter = createWatchStatusReporter(sys, /*pretty*/ true);

/** @type import('typescript').WatchStatusReporter */
const statusReporter = (diagnostic, newLine, options, errorCount) => {
  originalStatusReporter(diagnostic, newLine, options, errorCount);
  if (errorCount === 0) {
    refreshCliProcess();
  }
};

await import(new URL("./clean.js", import.meta.url).href);
const watchCompilerHost = createWatchCompilerHost(
  tsconfigPath,
  { noUnusedLocals: false, noUnusedParameters: false },
  sys,
  undefined,
  undefined,
  statusReporter
);

createWatchProgram(watchCompilerHost);
