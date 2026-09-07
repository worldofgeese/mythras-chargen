# Glorantha consent form notes

## Current architecture

- The browser serializes consent answers and POSTs JSON `{ "message": "..." }` to `/api/glorantha-consent`.
- `server/glorantha-consent-endpoint.js` owns validation, origin allowlisting, request limits, rate limiting, and delivery.
- The endpoint fixes delivery to the configured owner Telegram target and invokes the local OpenClaw CLI. The browser never calls `api.telegram.org`, chooses a chat, or receives a bot credential.
- Run the endpoint beside the static site with `npm run consent-server`. Set `CONSENT_ALLOWED_ORIGINS` to the exact HTTPS origin serving the form. Set `OPENCLAW_CWD` when the endpoint is not started from the project directory.
- The endpoint returns only `{ ok, messageId }` on success. It does not log consent text or provider output. Serve both form and endpoint over HTTPS.

## Credential boundary

- Telegram credentials stay in OpenClaw's protected Secret Store and are referenced by `channels.telegram.botToken` through a SecretRef.
- Do not add Telegram tokens, API URLs containing tokens, or client-side delivery credentials to this repository or generated output.
- OpenClaw's configured Telegram account, owner target, DM policy, group policy, streaming mode, and topic bindings remain outside this form's payload and are not client-controlled.

## Local verification

```bash
npm run test:consent
```

Use an authenticated OpenClaw second route for live delivery checks. Do not test by embedding a provider token in browser code or command arguments.

## History remediation

The prior browser token appeared in generated artifacts and the public repository history. Current files must be scanned before release. Removing the current literal does not erase public history; history rewrite and mirror remediation require explicit owner approval before force-push or other irreversible changes.
