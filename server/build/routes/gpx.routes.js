"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const gpx_controller_1 = require("../controllers/gpx.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Separate upload and progress endpoints
router.post('/upload', upload.single('gpxFile'), gpx_controller_1.gpxController.uploadGPX);
router.get('/progress/:uploadId', gpx_controller_1.gpxController.trackProgress);
// Surface detection endpoints
router.get('/surface', gpx_controller_1.gpxController.getSurfaceType);
router.post('/surface/batch', gpx_controller_1.gpxController.batchGetSurfaceTypes);
exports.default = router;
