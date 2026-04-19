import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception?.code === '42P01') {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Database schema missing. Run sql/001_queuegauge.sql.',
        requestId: request.requestId
      });
    }

    const status =
      exception?.getStatus?.() ??
      exception?.status ??
      HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception?.response?.message ?? exception?.message ?? 'Server error';
    return response.status(status).json({ error: message, requestId: request.requestId });
  }
}
