"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const route_model_1 = require("../features/route/models/route.model");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_config_1 = require("../shared/config/logger.config");
// Load environment variables
dotenv_1.default.config();
async function clearRoutes() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        await mongoose_1.default.connect(mongoUri);
        logger_config_1.logger.info('Connected to MongoDB');
        // Delete all routes
        const result = await route_model_1.RouteModel.deleteMany({});
        logger_config_1.logger.info(`Deleted ${result.deletedCount} routes`);
        await mongoose_1.default.disconnect();
        logger_config_1.logger.info('Disconnected from MongoDB');
    }
    catch (error) {
        logger_config_1.logger.error('Error:', error);
        process.exit(1);
    }
}
clearRoutes();
