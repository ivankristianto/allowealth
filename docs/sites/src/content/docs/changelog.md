---
title: Changelog
description: Recent updates and improvements to Allowealth.
draft: false
head: []
sidebar:
  label: Changelog
  order: 99
audience:
  - user
  - admin
  - developer
---

All notable changes to Allowealth are documented here.

## [Unreleased] - 2026-03-10

### Changed

- **Authentication rewrite:** Replaced the legacy Lucia, Arctic, and custom MFA stack with Better Auth and Astro middleware-backed session hydration.
- **Google linking flow:** Existing accounts now link Google only from the authenticated Security page. Pre-auth callback linking has been removed.
- **Security settings:** Two-factor setup, verification, backup codes, and account linking now use Better Auth-owned flows.

### Notes

- The Better Auth cutover invalidates legacy sessions, so users are signed out once after deployment.

## [Unreleased] - 2026-03-08

### Added

- New **Indonesia & SEA SaaS Phasing Plan** for market expansion.
- Integrated **SEA Founder Strategy Memo** into project research.

### Changed

- **Documentation Consolidation:** Merged local development and deployment guides into a single "Setup & Deployment" resource.
- Simplified project bootstrapping with a unified `./scripts/setup.sh`.

## [0.2.0] - 2026-03-07

### Added

- **Forecast Reality Check:** Implemented logic to compare projected forecasts against actual bank/account balances.
- **Recurring Frequency Forecast:** Added support for complex recurring transaction patterns in financial projections.

## [0.1.5] - 2026-03-06

### Added

- **CSP Middleware:** High-performance Content Security Policy middleware with nonce support for inline scripts.
- **Static Public Security:** Automated verification script for public asset security headers.

### Performance

- Optimized middleware execution order for faster Time to First Byte (TTFB).

## [0.1.0] - 2026-02-04

### Changed

- **Astro 6 Migration:** Upgraded the core framework to Astro 6.0 for improved build performance and view transitions.
- Updated database schema to support multi-currency financial tracking.
