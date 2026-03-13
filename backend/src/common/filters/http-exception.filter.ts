import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

export interface HttpExceptionResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const resolvedMessage =
      typeof message === 'object' && message !== null && 'message' in message
        ? (message as { message: string | string[] }).message
        : typeof message === 'string'
          ? message
          : JSON.stringify(message);

    const error =
      exception instanceof HttpException
        ? ((exception.getResponse() as { error?: string }).error ??
          exception.name)
        : 'Internal Server Error';

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (status >= 500) {
      this.logger.error(
        `${status} ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: HttpExceptionResponseBody = {
      statusCode: status,
      message: resolvedMessage,
      error,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    if (!isProduction && exception instanceof Error && exception.stack) {
      (body as HttpExceptionResponseBody & { stack?: string }).stack =
        exception.stack;
    }

    res.status(status).json(body);
  }
}
