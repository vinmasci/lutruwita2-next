"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const route_controller_1 = require("../controllers/route.controller");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const validateRoute_1 = require("../../../shared/middlewares/validateRoute");
const router = express_1.default.Router();
const controller = new route_controller_1.RouteController();
// All routes require authentication
router.use(auth_middleware_1.auth);
// Helper to bind controller methods with correct types
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
};
// Save a new route
router.post('/save', validateRoute_1.validateRouteData, asyncHandler(controller.saveRoute.bind(controller)));
// Update an existing route
router.put('/:persistentId', validateRoute_1.validateRouteData, asyncHandler(controller.updateRoute.bind(controller)));
// Get a specific route
router.get('/:persistentId', asyncHandler(controller.loadRoute.bind(controller)));
// List routes with optional filters
router.get('/', asyncHandler(controller.listRoutes.bind(controller)));
// Delete a route
router.delete('/:persistentId', asyncHandler(controller.deleteRoute.bind(controller)));
exports.default = router;
