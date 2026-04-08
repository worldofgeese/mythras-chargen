# Glorantha consent form notes

## Current architecture

- Static HTML form intended for fast public deployment
- Current delivery target is Telegram via the Loving Kypris bot
- Human submissions have been observed to arrive successfully
- Some Playwright/headless submissions do not appear in Telegram even when the page shows success

## Immediate next debugging goal

Compare browser automation network behavior against successful human submissions before changing architecture.

## Reuse goal

This repo can hold reusable form patterns, templates, serializers, and deployment notes so future forms are faster to produce.
