// @ts-check

import { URL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import ts from "typescript";
import express from "express";

const {
  // @ts-expect-error internal helper function
  createWatchStatusReporter,
  sys,
  createWatchCompilerHost,
  createWatchProgram,
} = ts;

await import("./clean.js");

const projectRootPath = fileURLToPath(new URL("..", import.meta.url));
const indexHTMLFileURL = new URL("../index.html", import.meta.url);
const PORT = 3000;

/** @type {Set<express.Response>} */
const connectedClients = new Set();

const app = express();
app.disable("x-powered-by");
app.get("/_dev", (_request, response) => {
  connectedClients.add(response);
  response.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  });
  response.flushHeaders();
  response.write("retry: 10000\n\n");
  response.once("close", () => connectedClients.delete(response));
});
app.get(["/", "/index.html"], (_request, response) => {
  const indexHTMLContents = readFileSync(indexHTMLFileURL, "utf8");
  response.type("html");
  response.end(injectLiveClient(indexHTMLContents));
});

app.use(express.static(projectRootPath));

const httpServer = app.listen(PORT);
await once(httpServer, "listening");

const tsconfigPath = fileURLToPath(
  new URL("../tsconfig.json", import.meta.url),
);

/** @type import('typescript').WatchStatusReporter */
const originalStatusReporter = createWatchStatusReporter(sys, /*pretty*/ true);

/** @type import('typescript').WatchStatusReporter */
const statusReporter = (diagnostic, newLine, options, errorCount) => {
  originalStatusReporter(diagnostic, newLine, options, errorCount);
  if (errorCount !== undefined) {
    printAddress();
  }
  if (errorCount === 0) {
    reloadConnectedClients();
  }
};

const watchCompilerHost = createWatchCompilerHost(
  tsconfigPath,
  { noUnusedLocals: false, noUnusedParameters: false },
  sys,
  undefined,
  undefined,
  statusReporter,
);

createWatchProgram(watchCompilerHost);

function reloadConnectedClients() {
  for (const client of connectedClients) {
    client.write("data: reload\n\n");
  }
}

function printAddress() {
  console.log(`Listening on: http://localhost:${PORT}`);
}

function injectLiveClient(html) {
  const bodyCloseIdx = html.lastIndexOf("</body>");
  return bodyCloseIdx === -1
    ? html
    : html.slice(0, bodyCloseIdx) +
        `  <script>
      const eventSource = new EventSource('/_dev');
      eventSource.addEventListener("message", ({ data }) => {
        if (data === "reload") {
          eventSource.close();
          window.location.reload();
        }
      });
    </script>\n  ` +
        html.slice(bodyCloseIdx);
}
