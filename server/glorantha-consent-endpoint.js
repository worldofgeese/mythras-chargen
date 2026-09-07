'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');

const DEFAULT_TARGET = '488228716';
const DEFAULT_ACCOUNT = 'default';
const DEFAULT_PORT = 8787;
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_MAX_MESSAGE_CHARS = 4096;
const DEFAULT_SEND_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 5;

function parseAllowedOrigins(value = '') {
  return new Set(
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function allowedOrigin(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

function writeJson(res, status, body, origin = null) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    let oversized = false;

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size <= maxBytes) body += chunk;
      else oversized = true;
    });
    req.on('end', () => {
      if (oversized) {
        const error = new Error('request body too large');
        error.statusCode = 413;
        reject(error);
      } else {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

function extractMessage(body, maxChars) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    const error = new Error('request body must be JSON');
    error.statusCode = 400;
    throw error;
  }

  const message = parsed && typeof parsed === 'object' ? parsed.message : null;
  if (typeof message !== 'string' || message.trim() === '') {
    const error = new Error('request must contain a non-empty message');
    error.statusCode = 400;
    throw error;
  }
  if (message.length > maxChars) {
    const error = new Error('message is too long');
    error.statusCode = 413;
    throw error;
  }
  return message;
}

function createOpenClawSender({
  binary = process.env.OPENCLAW_BIN || 'openclaw',
  cwd = process.env.OPENCLAW_CWD || process.cwd(),
  account = process.env.TELEGRAM_ACCOUNT || DEFAULT_ACCOUNT,
  target = process.env.TELEGRAM_TARGET || DEFAULT_TARGET,
  timeoutMs = Number(process.env.OPENCLAW_SEND_TIMEOUT_MS) || DEFAULT_SEND_TIMEOUT_MS,
} = {}) {
  return (message) => new Promise((resolve, reject) => {
    const child = spawn(binary, [
      'message',
      'send',
      '--channel',
      'telegram',
      '--account',
      account,
      '--target',
      target,
      '--message',
      message,
      '--json',
    ], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let stdout = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('close', (code, signal) => finish(() => {
      if (code !== 0) {
        reject(new Error(`OpenClaw send failed (${signal || code})`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        const payload = result.payload || result;
        if (!payload.ok) throw new Error('OpenClaw send was not acknowledged');
        resolve({ messageId: payload.messageId });
      } catch {
        reject(new Error('OpenClaw send returned an invalid result'));
      }
    }));

    const timer = setTimeout(() => finish(() => {
      child.kill('SIGTERM');
      reject(new Error('OpenClaw send timed out'));
    }), timeoutMs);
  });
}

function createServer({
  sendMessage = createOpenClawSender(),
  allowedOrigins = parseAllowedOrigins(process.env.CONSENT_ALLOWED_ORIGINS),
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  maxMessageChars = DEFAULT_MAX_MESSAGE_CHARS,
  rateLimitWindowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
  rateLimitMax = DEFAULT_RATE_LIMIT_MAX,
} = {}) {
  const requests = new Map();

  function isRateLimited(address) {
    const now = Date.now();
    const recent = (requests.get(address) || []).filter((time) => now - time < rateLimitWindowMs);
    recent.push(now);
    requests.set(address, recent);
    for (const [key, times] of requests) {
      if (!times.some((time) => now - time < rateLimitWindowMs)) requests.delete(key);
    }
    return recent.length > rateLimitMax;
  }

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || null;
    if (!allowedOrigin(origin, allowedOrigins)) {
      writeJson(res, 403, { ok: false, error: 'origin not allowed' });
      return;
    }

    const requestUrl = new URL(req.url || '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/glorantha-consent') {
      writeJson(res, 404, { ok: false, error: 'not found' }, origin && allowedOrigins.has(origin) ? origin : null);
      return;
    }

    if (req.method === 'OPTIONS') {
      if (!origin) {
        writeJson(res, 204, {}, null);
        return;
      }
      res.writeHead(204, {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'no-store',
        Vary: 'Origin',
      });
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: 'method not allowed' }, origin && allowedOrigins.has(origin) ? origin : null);
      return;
    }

    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      writeJson(res, 415, { ok: false, error: 'content type must be application/json' }, origin && allowedOrigins.has(origin) ? origin : null);
      return;
    }

    if (isRateLimited(req.socket.remoteAddress || 'unknown')) {
      writeJson(res, 429, { ok: false, error: 'too many requests' }, origin && allowedOrigins.has(origin) ? origin : null);
      return;
    }

    try {
      const message = extractMessage(await readBody(req, maxBodyBytes), maxMessageChars);
      const result = await sendMessage(message);
      writeJson(res, 200, { ok: true, messageId: result.messageId }, origin && allowedOrigins.has(origin) ? origin : null);
    } catch (error) {
      const status = error.statusCode || 502;
      writeJson(res, status, { ok: false, error: status < 500 ? error.message : 'submission failed' }, origin && allowedOrigins.has(origin) ? origin : null);
    }
  });
}

function startServer() {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const server = createServer();
  server.listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`Consent endpoint listening on ${process.env.HOST || '127.0.0.1'}:${port}`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = {
  createOpenClawSender,
  createServer,
  extractMessage,
  parseAllowedOrigins,
};
