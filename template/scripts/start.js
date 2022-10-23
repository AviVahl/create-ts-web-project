// @ts-check

import { URL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import ts from "typescript";
import express from "express";
import { WebSocketServer } from "ws";

const {
  // @ts-expect-error internal helper function
  createWatchStatusReporter,
  sys,
  createWatchCompilerHost,
  createWatchProgram,
} = ts;

await import(new URL("./clean.js", import.meta.url).href);

const projectRootPath = fileURLToPath(new URL("..", import.meta.url));
const indexHTMLFileURL = new URL("../index.html", import.meta.url);
const PORT = 3000;

const app = express();
app.disable("x-powered-by");
app.get(["/", "/index.html"], (_request, response) => {
  const indexHTMLContents = readFileSync(indexHTMLFileURL, "utf8");
  response.type("html");
  response.end(injectLiveClient(indexHTMLContents));
});
app.use(express.static(projectRootPath));

const httpServer = app.listen(PORT);
const wss = new WebSocketServer({ server: httpServer });
await once(httpServer, "listening");

const tsconfigPath = fileURLToPath(
  new URL("../tsconfig.json", import.meta.url)
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
  statusReporter
);

createWatchProgram(watchCompilerHost);

function reloadConnectedClients() {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send("reload");
    }
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
      const wsURL = new URL(window.location.href);
      wsURL.protocol = "ws";
      wsURL.hash = "";
      const ws = new WebSocket(wsURL);
      ws.addEventListener("message", ({ data }) => {
        if (data === "reload") {
          window.location.reload();
        }
      });
    </script>\n  ` +
        html.slice(bodyCloseIdx);
}
