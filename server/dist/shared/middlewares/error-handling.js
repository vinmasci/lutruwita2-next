"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'MulterError') {
        res.status(400).json({
            error: 'File upload error',
            message: err.message
        });
        return;
    }
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
};
exports.errorHandler = errorHandler;
