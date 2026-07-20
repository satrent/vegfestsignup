// Minimal Basecamp API client. Reads tokens from .env, refreshes when expired.
//
//   import { bc } from './client.mjs';
//   const projects = await bc('projects.json');   // GET
//   console.log(projects.map(p => p.name));
//
// No external dependencies — Node built-ins only.

import https from 'node:https';
import { URL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, '.env');

function loadEnv() {
  const env = {};
  if (!existsSync(ENV_PATH)) return env;
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function saveEnv(updates) {
  let lines = readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_PATH, lines.join('\n'));
}

function request(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: data })
        );
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function refreshToken(env) {
  const params = new URLSearchParams({
    type: 'refresh',
    refresh_token: env.BASECAMP_REFRESH_TOKEN,
    client_id: env.BASECAMP_CLIENT_ID,
    client_secret: env.BASECAMP_CLIENT_SECRET,
  }).toString();
  const res = await request('POST', 'https://launchpad.37signals.com/authorization/token', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(params),
    },
    body: params,
  });
  if (res.status < 200 || res.status >= 300)
    throw new Error(`Token refresh failed ${res.status}: ${res.body}`);
  const token = JSON.parse(res.body);
  const expiresAt = Date.now() + (token.expires_in ?? 1209600) * 1000;
  saveEnv({
    BASECAMP_ACCESS_TOKEN: token.access_token,
    BASECAMP_TOKEN_EXPIRES_AT: String(expiresAt),
  });
  return token.access_token;
}

// GET (or method) a Basecamp path relative to the account, e.g. "projects.json".
// Absolute URLs (like the `next` links Basecamp returns) are used as-is.
export async function bc(path, { method = 'GET', body } = {}) {
  const env = loadEnv();
  if (!env.BASECAMP_ACCESS_TOKEN)
    throw new Error('No access token. Run `node auth.mjs` first.');

  let token = env.BASECAMP_ACCESS_TOKEN;
  const expiresAt = Number(env.BASECAMP_TOKEN_EXPIRES_AT || 0);
  // Refresh 5 min before expiry.
  if (env.BASECAMP_REFRESH_TOKEN && expiresAt && Date.now() > expiresAt - 300_000) {
    token = await refreshToken(env);
  }

  const base = `https://3.basecampapi.com/${env.BASECAMP_ACCOUNT_ID}/`;
  const url = path.startsWith('http') ? path : base + path.replace(/^\//, '');
  const payload = body ? JSON.stringify(body) : undefined;

  const doRequest = (bearer) =>
    request(method, url, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        'User-Agent': env.BASECAMP_USER_AGENT || 'VegFest Signup',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      body: payload,
    });

  let res = await doRequest(token);
  // If unauthorized and we can refresh, try once more.
  if (res.status === 401 && env.BASECAMP_REFRESH_TOKEN) {
    token = await refreshToken(env);
    res = await doRequest(token);
  }
  if (res.status < 200 || res.status >= 300)
    throw new Error(`Basecamp API ${res.status}: ${res.body}`);
  return res.body ? JSON.parse(res.body) : null;
}

// Run directly for a quick smoke test: `node client.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  bc('projects.json')
    .then((projects) => {
      console.log(`${projects.length} project(s):`);
      for (const p of projects) console.log(`  ${p.id}  ${p.name}`);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
