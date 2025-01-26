"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_CONFIG = void 0;
const path_1 = __importDefault(require("path"));
exports.SERVER_CONFIG = {
    port: process.env.PORT || 8080,
    uploadsDir: path_1.default.join(__dirname, '../../../../uploads'),
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['.gpx'],
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? 'https://your-production-domain.com'
            : ['http://localhost:3000'],
        credentials: true
    }
};
