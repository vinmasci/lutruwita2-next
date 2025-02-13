"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const poi_controller_1 = require("../controllers/poi.controller");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const router = (0, express_1.Router)();
const poiController = new poi_controller_1.POIController();
// Get all POIs
router.get('/', auth_middleware_1.auth, (req, res) => poiController.getPOIs(req, res));
// Save POIs
router.post('/', auth_middleware_1.auth, (req, res) => poiController.savePOIs(req, res));
// Delete all POIs
router.delete('/', auth_middleware_1.auth, (req, res) => poiController.deleteAllPOIs(req, res));
exports.default = router;
