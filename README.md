# GrowEasy AI-Powered CSV Importer

An AI-powered CSV import application that accepts CSV files with varying column names, layouts, and structures and converts valid lead data into the GrowEasy CRM schema.

The application provides CSV preview, AI-assisted schema mapping, manual mapping review, batch AI extraction, validation, duplicate handling, skipped-record reporting, import history, saved mappings, CSV export, dark/light mode, automated tests, Docker configuration, and deployment support.

## Live Application

Hosted Application: To be added after deployment

## Repository

GitHub Repository:

https://github.com/vikas-choudhaary/groweasy-csv-importer

## Assignment Workflow

The application follows the required import workflow.

### 1. Upload CSV

Users can upload a valid CSV file using drag-and-drop or the file picker.

The application accepts CSV files with different column names and structures.

Examples include:

- Facebook lead exports
- Google Ads exports
- CRM exports
- Real estate lead data
- Sales reports
- Marketing agency CSVs
- Manually created spreadsheets

### 2. Preview CSV

The CSV is parsed and previewed before backend AI processing begins.

The preview table supports:

- Responsive layout
- Horizontal scrolling
- Vertical scrolling
- Sticky headers
- CSV validation
- Large dataset handling

No AI extraction is performed during the initial preview step.

### 3. AI-Assisted Schema Mapping

The application analyzes source columns and suggests mappings to the GrowEasy CRM schema.

Users can:

- Review AI-generated mappings
- Correct mappings manually
- Detect duplicate target mappings
- Save mappings for reuse
- Review mapping confidence
- Continue only after mapping validation succeeds

### 4. Confirm and Process Import

Backend processing begins only after the user confirms the import.

The Express backend:

1. Accepts the CSV records and mapping configuration.
2. Parses records without assuming fixed column names.
3. Processes records in batches.
4. Sends records to Gemini for structured extraction.
5. Validates and normalizes the AI output.
6. Applies GrowEasy CRM business rules.
7. Handles duplicate records.
8. Persists valid records and import metadata.
9. Returns imported and skipped records as structured JSON.

### 5. Review Import Results

After processing, the application displays:

- Total processed records
- Successfully imported records
- Skipped records
- Success rate
- Responsive imported-record table
- Skipped-record table with rejection reasons
- Search and filtering controls
- CSV export
- Import history

## GrowEasy CRM Schema

The application extracts as many of the following fields as possible:

| Field | Description |
| --- | --- |
| `created_at` | Lead creation date |
| `name` | Lead name |
| `email` | Primary email address |
| `country_code` | Country calling code |
| `mobile_without_country_code` | Mobile number without country code |
| `company` | Company name |
| `city` | City |
| `state` | State |
| `country` | Country |
| `lead_owner` | Lead owner |
| `crm_status` | CRM lead status |
| `crm_note` | Notes, remarks, and additional information |
| `data_source` | Lead source |
| `possession_time` | Property possession time |
| `description` | Additional description |

## CRM Business Rules

### Allowed CRM Status Values

Only the following values are accepted:

- `GOOD_LEAD_FOLLOW_UP`
- `DID_NOT_CONNECT`
- `BAD_LEAD`
- `SALE_DONE`

### Allowed Data Source Values

Only the following values are accepted:

- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

If the source cannot be determined confidently, the value is left blank.

### Date Handling

`created_at` values are normalized into JavaScript-compatible date values.

The resulting value must be parseable using:

```javascript
new Date(created_at)
```

### Multiple Emails and Mobile Numbers

When multiple email addresses are present:

- The first valid email becomes the primary `email`.
- Additional email addresses are appended to `crm_note`.

When multiple mobile numbers are present:

- The first valid mobile number becomes `mobile_without_country_code`.
- Additional mobile numbers are appended to `crm_note`.

### Invalid Records

A record is skipped when it contains neither:

- A valid email address
- A valid mobile number

Skipped records are returned with rejection reasons and displayed separately in the frontend.

### Duplicate Email Handling

The application handles:

- Duplicate emails within the uploaded CSV
- Duplicate emails against existing database records
- Mixed batches containing new and duplicate records
- Partial-success imports

The first valid unique record is preserved while duplicate records are skipped without causing the entire import to fail.

## AI Extraction

The backend uses Google's Gemini model through the AI SDK for intelligent field extraction.

AI processing supports:

- Semantic column interpretation
- Messy CSV structures
- Ambiguous column names
- Batch processing
- Structured output
- Prompt-based CRM rule enforcement
- Schema validation
- Retry handling
- Quota and rate-limit error handling

The application also provides an AI mock mode for deterministic local development and automated testing without consuming API quota.

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Papa Parse
- Motion

### Backend

- Node.js
- Express
- TypeScript
- Zod
- AI SDK
- Gemini

### Persistence

- SQLite
- `better-sqlite3`

The application stores lead records and import-related data locally using SQLite.

### Testing

- Node.js Test Runner
- TypeScript test execution using `tsx`
- Unit tests
- Integration tests
- Mapping tests
- Retry tests
- Regression tests
- Duplicate-handling tests
- End-to-end tests

### DevOps

- Docker
- Docker Compose
- Separate frontend and backend Dockerfiles

## Project Structure

```text
groweasy-csv-importer/
|
|-- public/
|
|-- server/
|   |-- src/
|   |   |-- controllers/
|   |   |-- routes/
|   |   |-- schemas/
|   |   |-- services/
|   |   |-- types/
|   |   |-- utils/
|   |   |-- app.ts
|   |   `-- server.ts
|   `-- tsconfig.json
|
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |-- history/
|   |   |-- mappings/
|   |   |-- settings/
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |
|   |-- components/
|   |   |-- csv/
|   |   |-- layout/
|   |   `-- ui/
|   |
|   `-- lib/
|
|-- tests/
|   |-- fixtures/
|   |-- duplicate.test.ts
|   |-- e2e.test.ts
|   |-- integration.test.ts
|   |-- mapping.test.ts
|   |-- regression.test.ts
|   |-- retry.test.ts
|   `-- unit.test.ts
|
|-- Dockerfile.frontend
|-- Dockerfile.backend
|-- docker-compose.yml
|-- package.json
|-- package-lock.json
|-- next.config.ts
`-- README.md
```

## Local Setup

### Prerequisites

Install:

- Node.js 20 or later
- npm
- Git

A Gemini API key is required when running with real AI processing enabled.

## 1. Clone the Repository

```bash
git clone https://github.com/vikas-choudhaary/groweasy-csv-importer.git
cd groweasy-csv-importer
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file in the project root.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
EXPRESS_PORT=4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
AI_MOCK_MODE=false
```

Do not commit `.env` files or API keys to Git.

## 4. Run the Application

Start the frontend and backend development servers:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000
```

## AI Mock Mode

For local development or testing without consuming Gemini API quota:

```env
AI_MOCK_MODE=true
```

For real Gemini AI extraction:

```env
AI_MOCK_MODE=false
```

A valid `GEMINI_API_KEY` is required when mock mode is disabled.

## Production Build

Run:

```bash
npm run build
```

This builds both the Next.js frontend and the Express TypeScript backend.

## Testing

Run the complete automated test suite:

```bash
npm test
```

The test suite covers:

- CSV processing
- AI extraction behavior
- CRM normalization
- Mapping logic
- Retry behavior
- Database persistence
- Duplicate email handling
- Partial-success imports
- Summary counts
- Regression scenarios
- Integration workflows
- Error handling

Some AI error-path tests intentionally simulate quota exhaustion and HTTP 429 responses. These errors are expected during those tests and verify that the application handles AI provider failures correctly.

## Docker

The project includes:

- `Dockerfile.frontend`
- `Dockerfile.backend`
- `docker-compose.yml`

Build and run the application using:

```bash
docker compose up --build
```

## Deployment

The application can be deployed using separate frontend and backend services.

### Frontend

Recommended platforms:

- Vercel
- Render
- Railway

Configure:

```text
NEXT_PUBLIC_API_BASE_URL=<deployed-backend-url>
```

### Backend

Recommended platforms:

- Render
- Railway

Configure:

```text
GEMINI_API_KEY=<production-gemini-api-key>
AI_MOCK_MODE=false
```

The hosting platform should provide the production port to the backend environment when required.

Because the application uses SQLite persistence, production deployments must account for persistent filesystem requirements. Ephemeral server filesystems can lose SQLite data after redeployment or instance restart.

## Error Handling

The application handles:

- Invalid CSV files
- Empty CSV files
- Missing email and mobile values
- Duplicate target mappings
- Duplicate emails
- Invalid AI output
- AI rate limits
- AI quota exhaustion
- Batch failures
- Database errors
- Network failures

Failures are surfaced to the frontend with user-readable messages instead of silently crashing the import workflow.

## Bonus Features Implemented

The project includes several assignment bonus features:

- Drag-and-drop CSV upload
- AI processing progress indicators
- Retry handling for transient AI failures
- Dark mode and light mode
- Automated tests
- Docker setup
- Responsive tables
- Sticky table headers
- Saved mappings
- Import history
- CSV export
- AI mock mode for deterministic development and testing

## Security Notes

- Environment files are excluded from Git.
- API keys must never be committed.
- Uploaded runtime files are excluded from Git.
- SQLite runtime databases are excluded from Git.
- AI responses are validated before records are accepted.
- Backend validation is applied before persistence.

## Author

Vikas Parihar

Software Developer Intern Assignment Submission