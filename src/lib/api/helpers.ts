import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { toErrorResponse, AppError } from '../errors';
import { logger } from '../logger';
import { metrics, METRICS } from '../metrics';

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    throw error; // Will be caught by error handler
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(url: URL, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}

/**
 * Validate path parameters against a Zod schema
 */
export function validateParams<T>(params: Record<string, string>, schema: ZodSchema<T>): T {
  return schema.parse(params);
}

/**
 * Wrap an API handler with error handling, logging, and metrics
 */
export function apiHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const path = new URL(request.url).pathname;
    const method = request.method;

    const requestLogger = logger.child({ path, method });

    try {
      requestLogger.info('API request started');
      metrics.incrementCounter(METRICS.API_REQUEST, { method, path });

      const response = await handler(request, context);

      const duration = Date.now() - startTime;
      metrics.recordHistogram(METRICS.API_REQUEST + '_duration', duration, {
        method,
        path,
        status: response.status.toString(),
      });

      requestLogger.info('API request completed', {
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      metrics.incrementCounter(METRICS.API_ERROR, { method, path });
      metrics.recordHistogram(METRICS.API_REQUEST + '_duration', duration, {
        method,
        path,
        error: 'true',
      });

      requestLogger.error('API request failed', error, { duration });

      const errorResponse = toErrorResponse(error, path);
      const statusCode = errorResponse.error.statusCode;

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a created response
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Create a no content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Extract params from Next.js route context
 */
export function getParams(context: { params: Record<string, string> | Promise<Record<string, string>> }): Record<string, string> {
  if (context.params instanceof Promise) {
    throw new Error('Params must be awaited before use');
  }
  return context.params;
}
