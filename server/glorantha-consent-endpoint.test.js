'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createServer } = require('./glorantha-consent-endpoint');

function request(server, { method = 'POST', path = '/api/glorantha-consent', headers = {}, body = '' } = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: address.port,
      method,
      path,
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(responseBody || '{}') }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function withServer(options, callback) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await callback(server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('forwards only validated message to fixed sender', async () => {
  const messages = [];
  await withServer({
    allowedOrigins: new Set(['https://consent.example']),
    sendMessage: async (message) => { messages.push(message); return { messageId: '42' }; },
  }, async (server) => {
    const response = await request(server, {
      headers: { 'Content-Type': 'application/json', Origin: 'https://consent.example' },
      body: JSON.stringify({ message: 'consent response', chatId: 'attacker-target' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true, messageId: '42' });
  });
  assert.deepEqual(messages, ['consent response']);
});

test('rejects unapproved browser origins', async () => {
  await withServer({ allowedOrigins: new Set(['https://consent.example']), sendMessage: async () => ({ messageId: 'unused' }) }, async (server) => {
    const response = await request(server, {
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ message: 'blocked' }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { ok: false, error: 'origin not allowed' });
  });
});

test('rejects malformed or oversized submissions', async () => {
  await withServer({ allowedOrigins: new Set(), maxMessageChars: 10, sendMessage: async () => ({ messageId: 'unused' }) }, async (server) => {
    const malformed = await request(server, {
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);

    const oversized = await request(server, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '01234567890' }),
    });
    assert.equal(oversized.status, 413);
  });
});

test('rejects non-JSON and non-POST requests', async () => {
  await withServer({ sendMessage: async () => ({ messageId: 'unused' }) }, async (server) => {
    const contentType = await request(server, {
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    assert.equal(contentType.status, 415);

    const method = await request(server, { method: 'GET' });
    assert.equal(method.status, 405);
  });
});
