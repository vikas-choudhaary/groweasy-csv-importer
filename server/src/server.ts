import dotenv from 'dotenv';
import path from 'path';

// Ensure we load the .env from the project root reliably
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.GEMINI_API_KEY && process.env.AI_MOCK_MODE !== 'true') {
  console.error('[server]: FATAL ERROR - GEMINI_API_KEY environment variable is missing.');
  console.error('[server]: Please ensure GEMINI_API_KEY is set in your .env file or enable AI_MOCK_MODE=true.');
  process.exit(1);
}

// Important: Import app AFTER dotenv is loaded and validated, 
// so any modules defining AI providers will have access to process.env.
import app from './app';

const PORT = process.env.PORT || process.env.EXPRESS_PORT || 4000;

app.listen(PORT, () => {
  console.log(`[server]: Express backend is running at http://localhost:${PORT}`);
});
