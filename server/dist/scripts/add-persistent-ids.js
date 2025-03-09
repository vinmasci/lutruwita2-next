"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const uuid_1 = require("uuid");
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'lutruwita';
async function addPersistentIds() {
    const client = new mongodb_1.MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);
        const routes = db.collection('routes');
        // Find all routes that don't have a persistentId
        const routesWithoutPersistentId = await routes.find({
            persistentId: { $exists: false }
        }).toArray();
        console.log(`Found ${routesWithoutPersistentId.length} routes without persistentId`);
        // Update each route with a new UUID
        for (const route of routesWithoutPersistentId) {
            const persistentId = (0, uuid_1.v4)();
            await routes.updateOne({ _id: route._id }, { $set: { persistentId } });
            console.log(`Added persistentId ${persistentId} to route ${route._id}`);
        }
        console.log('Finished adding persistent IDs');
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await client.close();
    }
}
// Run the script
addPersistentIds().catch(console.error);
