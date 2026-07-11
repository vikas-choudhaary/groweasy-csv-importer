import express from 'express';
import cors from 'cors';
import importRoutes from './routes/import.routes';
import schemaRoutes from './routes/schema.routes';
import mappingRoutes from './routes/mapping.routes';

const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Increase limits for mapping configs parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/imports', importRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/mappings', mappingRoutes);

// Health check endpoint for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    aiMode: process.env.AI_MOCK_MODE === 'true' ? 'mock' : 'gemini'
  });
});

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
