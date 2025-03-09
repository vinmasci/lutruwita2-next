"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const public_route_controller_1 = require("../controllers/public-route.controller");
const router = express_1.default.Router();
const controller = new public_route_controller_1.PublicRouteController();
// Helper to bind controller methods with correct types
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
};
// List public routes with optional type filter
router.get('/', asyncHandler(controller.listPublicRoutes.bind(controller)));
// Get a specific public route
router.get('/:persistentId', asyncHandler(controller.loadPublicRoute.bind(controller)));
exports.default = router;
