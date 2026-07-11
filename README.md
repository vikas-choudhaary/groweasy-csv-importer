# GrowEasy CSV Importer

An intelligent data import pipeline built for modern CRMs. 
This project leverages Google's Gemini LLM to automatically parse, normalize, and extract structured data from chaotic CSV files (like messy Facebook Ads exports, manual spreadsheets, and legacy CRMs) without requiring the user to perform manual column mapping.

## Overview

The GrowEasy CSV Importer provides a streamlined 3-step workflow:
1. **Upload:** Users upload a `.csv` file.
2. **Preview:** The frontend parses the file in the browser and displays a responsive data table.
3. **Confirm & Import:** The raw file is sent to the backend where it is chunked and processed by the AI in batches, bypassing the tedious manual field-mapping step.

## Features & Architecture

- **Frontend (Next.js App Router):** 
  - Drag-and-drop file handling with `papaparse` for instant browser-side preview.
  - Interactive, responsive data tables with sticky headers.
  - Safe error handling parsing JSON structured errors from the backend.
  - *Tech:* React, Tailwind CSS, Motion.
  
- **Backend (Express):**
  - Secure API endpoints using `multer` for stream-to-disk handling (safe up to 50MB files).
  - Strict Zod validation and normalization logic enforcing CRM schemas.
  - Intelligent API Quota handling and catastrophic error bubbling (e.g. 429 Rate Limits).
  - *Tech:* Node.js, Express, Zod, @ai-sdk/google.

### Intelligent Data Extraction

Instead of static deterministic mapping (e.g., column `First Name` maps to `name`), we send chunks of raw rows to **Gemini 2.5 Flash** using Vercel's AI SDK (`generateObject`). The LLM intelligently infers names, formats phone numbers, standardizes dates, and normalizes enum strings into exactly what the CRM expects.

#### Enforced CRM Schema Fields:
- `name` (string)
- `email` (string, optional)
- `mobile_with_country_code` (string, optional)
- `mobile_without_country_code` (string, optional)
- `project` (string)
- `data_source` (enum: `facebook_ads`, `website`, `google_ads`, `organic`, `referral`, `offline_marketing`, `unknown`)
- `lead_status` (enum: `new`, `contacted`, `interested`, `not_interested`, `qualified`, `lost`, `unknown`)
- `notes` (string, optional)
- `created_at` (ISO date string, optional)

#### Validation Rules & Batching:
- **Batching:** Files are chunked into 20-row batches to adhere to LLM context window stability and API throughput.
- **Rule:** A record lacking *both* an email and a mobile number is strictly rejected.
- **Retry Strategy:** We employ an exponential backoff algorithm (`withRetry`). If Gemini throws a transient rate-limiting error, the batch delays and retries up to 3 times before returning a safe HTTP 429 to the user.

## Project Structure

```text
groweasy-csv-importer/
├── package.json
├── .env.example
├── server/                    # Express Backend
│   ├── src/
│   │   ├── controllers/       # Route handling
│   │   ├── services/          # CSV parsing, AI extraction, Retry logic
│   │   ├── schemas/           # Zod Definitions (LLM prompt schemas vs strict validation)
│   │   ├── utils/             # Exponential backoff, Error formatting
│   │   ├── app.ts             # Express & CORS setup
│   │   └── server.ts          # Entry point
│   └── tsconfig.json
├── src/                       # Next.js Frontend
│   ├── app/                   # App Router UI
│   ├── components/            # UI, CSV Previews, Layouts
│   └── lib/                   # Utility types and API helpers
└── tests/                     # E2E Adversarial Test Suite
```

## Local Setup

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd groweasy-csv-importer
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_google_ai_studio_key
   PORT=4000
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   CORS_ORIGIN=*
   ```

3. **Start Development Servers**
   Runs both Next.js and Express concurrently:
   ```bash
   npm run dev
   ```

## Deployment Instructions

This repository is configured for dual-deployment (Frontend on Vercel, Backend on Render/Railway).

### Backend (Render / Railway)
1. Link your Git repository.
2. Set the Build Command: `npm run build:backend`
3. Set the Start Command: `npm run start:backend`
4. **Environment Variables Required:**
   - `GEMINI_API_KEY`: Your production AI Studio key.
   - `CORS_ORIGIN`: Your production Vercel frontend URL (e.g., `https://my-groweasy-frontend.vercel.app`).
   - *Note:* The `PORT` is automatically injected by Render.

### Frontend (Vercel)
1. Link your Git repository in Vercel.
2. Vercel will automatically detect the Next.js framework.
3. **Environment Variables Required:**
   - `NEXT_PUBLIC_API_BASE_URL`: The URL of your deployed Express backend (e.g., `https://groweasy-api.onrender.com`).

## Testing Strategy

The project employs robust adversarial testing.
Run the test suite using `npm test` or the full audit using `npm run verify`.

The test fixtures (`tests/fixtures/`) include:
- `messy-leads.csv`: 20 chaotic rows with missing fields and bad data.
- `alternate-schema.csv`: Radically changed header names.
- `batch-test.csv`: 40+ rows testing deterministic ordering and multiple LLM batch calls.

### Known Limitations & Security Notes
- **Gemini Free-Tier Limits:** Heavy consecutive use of the E2E test suite may trigger Google API `429` Rate Limit blocks (15 requests per minute limit on free keys). This is an expected operational constraint and the app will safely notify the user to wait rather than crash.
- **Git Security:** No secrets have been committed to this repository. Please maintain `.env` in `.gitignore`.
