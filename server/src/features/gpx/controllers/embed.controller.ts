import { Request, Response } from 'express';
import axios from 'axios';

export class EmbedController {
    /**
     * Get route data for embedding
     * @param req Request
     * @param res Response
     */
    getRouteForEmbed = async (req: Request, res: Response): Promise<void> => {
        try {
            const { routeId } = req.params;
            
            // Call the API endpoint to get the route data
            const apiUrl = `${process.env.API_BASE_URL || ''}/api/routes/embed/${routeId}`;
            console.log(`Fetching route data from API: ${apiUrl}`);
            
            const response = await axios.get(apiUrl);
            
            if (!response.data) {
                res.status(404).json({ error: 'Route not found' });
                return;
            }
            
            // Return the route data
            res.json(response.data);
        } catch (error) {
            console.error('Error getting route for embed:', error);
            res.status(500).json({ error: 'Failed to get route' });
        }
    };
}

// Create an instance of the controller for direct imports
export const embedController = new EmbedController();

// Export the getRouteForEmbed method for direct use
export const getRouteForEmbed = embedController.getRouteForEmbed;
