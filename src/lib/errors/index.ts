/**
 * Custom error classes for the membership gateway
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, details?: unknown) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
    timestamp: string;
    path?: string;
  };
}

/**
 * Convert an error to a standardized error response
 */
export function toErrorResponse(error: unknown, path?: string): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: new Date().toISOString(),
        path,
      },
    };
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown };
    if (prismaError.code === 'P2002') {
      return {
        error: {
          message: 'A record with this value already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          statusCode: 409,
          details: prismaError.meta,
          timestamp: new Date().toISOString(),
          path,
        },
      };
    }
    if (prismaError.code === 'P2025') {
      return {
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path,
        },
      };
    }
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: zodError.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
        path,
      },
    };
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    error: {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path,
    },
  };
}
