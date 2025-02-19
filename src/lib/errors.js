export class HttpError extends Error {
    constructor(message, statusCode) {
        super(message);
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
