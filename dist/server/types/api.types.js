export class HttpError extends Error {
    status;
    message;
    timestamp;
    path;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.message = message;
        this.timestamp = new Date().toISOString();
    }
}
