"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.photoRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const photo_controller_1 = require("../controllers/photo.controller");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const router = (0, express_1.Router)();
const photoController = new photo_controller_1.PhotoController();
// Configure multer for memory storage (we'll process and send to S3)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});
// Photo upload endpoint
router.post('/upload', auth_middleware_1.auth, upload.single('photo'), photoController.uploadPhoto);
// Photo deletion endpoint
router.delete('/delete', auth_middleware_1.auth, photoController.deletePhoto);
exports.photoRoutes = router;
