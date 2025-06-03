import { Request, Response, NextFunction } from 'express';

export class ApiException extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiException';
  }
}

// Обертка для асинхронных обработчиков
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Общий обработчик ошибок
export const errorHandler = (error: Error | ApiException, req: Request, res: Response) => {
  let status = 500;
  let message = 'Internal Server Error';
  let code: string | undefined;

  if (error instanceof ApiException) {
    status = error.status;
    message = error.message;
    code = error.code;
  } else if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  // Логируем ошибку
  console.error(`[${new Date().toISOString()}] API Error:`, {
    method: req.method,
    url: req.url,
    status,
    message: error.message,
    stack: error.stack,
  });

  // Отправляем ответ
  const response: {
    status: string;
    message: string;
    code?: string;
    stack?: string;
  } = {
    status: 'error',
    message,
  };

  if (code) {
    response.code = code;
  }

  // В режиме разработки включаем stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(status).json(response);
};

// Middleware для валидации параметров
export const validateParams = (requiredParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingParams: string[] = [];

    for (const param of requiredParams) {
      if (!req.query[param] && !req.body[param] && !req.params[param]) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      throw new ApiException(
        `Missing required parameters: ${missingParams.join(', ')}`,
        400,
        'MISSING_PARAMS',
      );
    }

    next();
  };
};

export const sendResponse = (res: Response, data: unknown, status: number = 200) => {
  res.status(status).json(data);
};
