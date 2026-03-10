# Wealth Wellness Hub

RWA-first hackathon MVP for a unified wealth dashboard that helps users understand tokenized real-world assets in one place.

## Overview

Wealth Wellness Hub addresses fragmented wealth visibility across digital assets and traditional-style tokenized products. The MVP provides a clear, interactive, read-only dashboard for portfolio value, allocation, yield context, compliance visibility, and holdings intelligence.

## Problem Statement Alignment

This project is designed for a university hackathon Wealth Wellness track and aligns with the expected outcomes:

- Unify and secure portfolio visibility across multiple asset types in one interface.
- Analyze financial wellness using concentration, yield spread, and risk/liquidity indicators.
- Visualize wealth composition with allocation and contribution views.
- Deliver an interactive dashboard that improves clarity and decision speed.

## Hackathon Submission Info

### GitHub Repository

- Repository: `https://github.com/DeclanErice/TeamPlayerOne_Track_WealthWellnessHub`

### Project Description (<=200 words)

Team Player One presents Wealth Wellness Hub, an RWA-first dashboard that helps users track tokenized real-world assets such as gold, treasuries, and real-estate-backed products in one wallet experience. Existing crypto wallets usually display these assets as generic tokens, making them difficult to interpret and compare. Our solution classifies each holding by asset type, shows issuer context, highlights indicative yield, and surfaces compliance information such as KYC or permissioned access.

For the seeding-round MVP, we built a read-only interface with a demo wallet state, portfolio KPIs, allocation and contribution views, grouped holdings intelligence, and a yield spread module against a reference T-bill rate. This solves the problem by improving transparency, usability, and decision speed for users entering tokenized finance.



### Video Pitch (Max 5 Minutes)

- YouTube link: `TBD`
- Required video title format: `FinTech Innovators Hackathon 2026_<teamname>`

## Features

- Portfolio snapshot cards: total value, blended yield, yield spread, estimated annual income, concentration, and weighted risk score.
- Allocation and contribution module with view switch.
- Grouped holdings table with search, filter, sort, and collapse/expand.
- Rule-based alerts and insights.
- Local-first demo rendering with API fallback.

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js (no external runtime dependency required for core API)
- API Contract: OpenAPI + markdown contract examples

## Project Structure

```text
api/
  openapi.json
  server.js
  data/
demo/
  index.html
  styles.css
  app.js
  data/
docs/
API_FORMAT.md
README.md
```

## Quick Start

Requirements: Node.js 18+

```bash
npm run start:api
```

Open:

- Demo UI: `http://localhost:8787/`
- API health: `http://localhost:8787/api/health`

## API Endpoints

Implemented routes:

- `GET /api/health`
- `GET /api/assets/catalog`
- `GET /api/portfolio/default`
- `GET /api/portfolio/wallet/{walletAddress}`
- `GET /api/yield/reference`
- `POST /api/portfolio/value`

For payload examples and response formats, see `API_FORMAT.md`.

## Scope and Limitations

- This seeding-round MVP is read-only by design.
- No live trade execution, onboarding pipeline, or KYC workflow is included.
- Metrics are based on available portfolio data and rule-based logic for demo purposes.


## License

Licensed under the terms in `LICENSE`.
