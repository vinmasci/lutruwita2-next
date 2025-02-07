"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const poi_controller_1 = require("../controllers/poi.controller");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const router = express_1.default.Router();
const controller = new poi_controller_1.POIController();
// All routes require authentication
router.use(auth_middleware_1.auth);
// Helper to bind controller methods with correct types
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
};
// Get all POIs
router.get('/', asyncHandler(controller.getAll.bind(controller)));
// Create a new POI
router.post('/', asyncHandler(controller.create.bind(controller)));
// Update a POI
router.put('/:id', asyncHandler(controller.update.bind(controller)));
// Delete a POI
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));
exports.default = router;
