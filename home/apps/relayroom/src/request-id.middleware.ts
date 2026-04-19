import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const started = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - started;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${requestId}`);
    });
    next();
  }
}
