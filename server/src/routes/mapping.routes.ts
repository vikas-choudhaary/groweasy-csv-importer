import { Router } from 'express';
import { suggestMappings, validateMapping, getPresets, createPreset, updatePreset, deletePreset, suggestPresets, usePreset, getPresetById } from '../controllers/mapping.controller';

const router = Router();

router.post('/suggest', suggestMappings);
router.post('/validate', validateMapping);
router.get('/presets/suggest', suggestPresets);
router.get('/presets', getPresets);
router.get('/presets/:id', getPresetById);
router.post('/presets', createPreset);
router.put('/presets/:id', updatePreset);
router.post('/presets/:id/use', usePreset);
router.delete('/presets/:id', deletePreset);

export default router;
