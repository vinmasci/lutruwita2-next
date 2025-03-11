import { Router } from 'express';
import { getRouteForEmbed } from '../controllers/embed.controller';

const router = Router();

// Route for getting a route for embedding
router.get('/:routeId', getRouteForEmbed);

export const embedRoutes = router;
