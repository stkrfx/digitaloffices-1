/**
 * CUSTOM APPLICATION ERRORS
 * Purpose: Centralized error definitions to decouple business logic from HTTP codes.
 * Standard: Follows the Error Object Pattern used in enterprise TypeScript applications.
 */

export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    readonly code: string;
  
    constructor(message: string, code: string) {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export class BadRequestError extends AppError {
    readonly statusCode = 400;
    constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
      super(message, code);
    }
  }
  
  export class UnauthorizedError extends AppError {
    readonly statusCode = 401;
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
      super(message, code);
    }
  }
  
  export class ForbiddenError extends AppError {
    readonly statusCode = 403;
    constructor(message = 'Forbidden', code = 'FORBIDDEN') {
      super(message, code);
    }
  }
  
  export class NotFoundError extends AppError {
    readonly statusCode = 404;
    constructor(message = 'Resource Not Found', code = 'NOT_FOUND') {
      super(message, code);
    }
  }
  
  export class ConflictError extends AppError {
    readonly statusCode = 409;
    constructor(message = 'Conflict Detected', code = 'CONFLICT') {
      super(message, code);
    }
  }
  
  export class InternalServerError extends AppError {
    readonly statusCode = 500;
    constructor(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') {
      super(message, code);
    }
  }