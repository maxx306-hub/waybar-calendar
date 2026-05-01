import fs from "fs";
import path from "path";
import http from "http";
import { exec } from "child_process";
import { google, Auth } from "googleapis";
import type { AccountConfig } from "./types.js";
import { CONFIG_DIR } from "./cache.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function tokenPath(accountId: string): string {
  return path.join(CONFIG_DIR, `token-${accountId}.json`);
}

export async function getAuthClient(account: AccountConfig, credentialsPath: string): Promise<Auth.OAuth2Client> {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed ?? credentials.web;

  const client = new google.auth.OAuth2(client_id, client_secret, "http://localhost");

  const tp = tokenPath(account.id);
  if (fs.existsSync(tp)) {
    client.setCredentials(JSON.parse(fs.readFileSync(tp, "utf8")));
    client.on("tokens", (tokens) => {
      const existing = fs.existsSync(tp)
        ? JSON.parse(fs.readFileSync(tp, "utf8"))
        : {};
      fs.writeFileSync(tp, JSON.stringify({ ...existing, ...tokens }));
    });
    return client;
  }

  return runOAuthFlow(client, account, tp);
}

async function runOAuthFlow(
  client: Auth.OAuth2Client,
  account: AccountConfig,
  tp: string
): Promise<Auth.OAuth2Client> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, "http://localhost");
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><p>Auth complete. Close this tab.</p></body></html>");
      server.close();

      if (!code) return reject(new Error("No code in OAuth redirect"));

      try {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        fs.writeFileSync(tp, JSON.stringify(tokens));
        client.on("tokens", (t) => {
          const existing = JSON.parse(fs.readFileSync(tp, "utf8") ?? "{}");
          fs.writeFileSync(tp, JSON.stringify({ ...existing, ...t }));
        });
        resolve(client);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      (client as unknown as { redirectUri: string }).redirectUri = `http://localhost:${port}`;

      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });

      console.error(`[oauth] Opening browser for account "${account.id}"...`);
      console.error(`[oauth] If browser does not open: ${authUrl}`);
      exec(`xdg-open "${authUrl}"`);
    });

    server.on("error", reject);
  });
}
