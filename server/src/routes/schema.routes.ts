import { Router } from 'express';
import { getSchemaMetadata } from '../controllers/schema.controller';

const router = Router();

router.get('/metadata', getSchemaMetadata);

export default router;
