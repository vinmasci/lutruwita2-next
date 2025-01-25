"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const server_config_1 = require("./shared/config/server.config");
const gpx_routes_1 = require("./features/gpx/routes/gpx.routes");
const error_handling_1 = require("./shared/middlewares/error-handling");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)(server_config_1.SERVER_CONFIG.cors));
app.use(express_1.default.json());
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Feature Routes
app.use('/api/gpx', gpx_routes_1.gpxRoutes);
// Error handling
app.use(error_handling_1.errorHandler);
// Start server
app.listen(server_config_1.SERVER_CONFIG.port, () => {
    console.log(`Server running on port ${server_config_1.SERVER_CONFIG.port}`);
});
