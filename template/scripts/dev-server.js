// @ts-check

import { once } from "node:events";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import { readFileSync } from "node:fs";

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
printAddress();

process.on("message", (data) => {
  if (data === "reload") {
    printAddress();
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send("reload");
      }
    }
  }
});

function printAddress() {
  console.log(`Listening on: http://localhost:${PORT}`);
}

export function injectLiveClient(html) {
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
