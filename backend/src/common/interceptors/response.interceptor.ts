import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export const SKIP_RESPONSE_INTERCEPTOR = 'skipResponseInterceptor';

export interface ResponseWrapper<T = unknown> {
  data: T;
  statusCode: number;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.get<boolean>(
      SKIP_RESPONSE_INTERCEPTOR,
      context.getHandler(),
    );
    if (skip) {
      return next.handle() as Observable<unknown>;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url?.split('?')[0] ?? '';
    if (path === '/health') {
      return next.handle() as Observable<unknown>;
    }

    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    return next.handle().pipe(
      map((data: unknown) => ({
        data,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
