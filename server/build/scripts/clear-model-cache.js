#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
async function clearModelCache() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        // Delete the Route model from Mongoose's model cache
        delete mongoose_1.default.models.Route;
        // Clear the model's schema cache (using internal property)
        const schemas = mongoose_1.default.modelSchemas;
        if (schemas && schemas.Route) {
            delete schemas.Route;
        }
        console.log('Successfully cleared Route model from cache');
        // Close the connection
        await mongoose_1.default.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
clearModelCache();
