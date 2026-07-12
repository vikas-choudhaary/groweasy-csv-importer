import { Router } from 'express';
import { suggestMappings, validateMapping } from '../controllers/mapping.controller';

const router = Router();

// Active routes for privacy-safe public demo
router.post('/suggest', suggestMappings);      // AI mapping suggestions
router.post('/validate', validateMapping);     // Mapping validation

// Removed routes (privacy-safe public demo):
// - GET /presets/suggest (preset suggestions)
// - GET /presets (list presets)
// - GET /presets/:id (get preset)
// - POST /presets (create preset)
// - PUT /presets/:id (update preset)
// - POST /presets/:id/use (use preset)
// - DELETE /presets/:id (delete preset)

export default router;
