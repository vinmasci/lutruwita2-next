"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
// Initialize Auth0 middleware
const auth0Middleware = (0, express_oauth2_jwt_bearer_1.auth)({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});
// Wrap Auth0 middleware to extract user info
const auth = async (req, res, next) => {
    try {
        // Verify JWT token
        await auth0Middleware(req, res, () => { });
        // Extract user info from token
        if (req.auth?.payload.sub) {
            req.user = {
                sub: req.auth.payload.sub,
                email: req.auth.payload.email,
                name: req.auth.payload.name
            };
        }
        else {
            throw new Error('Missing required user ID in token');
        }
        next();
    }
    catch (error) {
        res.status(401).json({
            error: 'Unauthorized',
            details: error instanceof Error ? error.message : 'Invalid token'
        });
    }
};
exports.auth = auth;
