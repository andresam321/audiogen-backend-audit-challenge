import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, path: reqPath, query } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const qs = Object.keys(query).length ? ` ?${new URLSearchParams(query as Record<string, string>).toString()}` : '';
    console.log(`[${new Date().toISOString()}] ${method} ${reqPath}${qs} → ${res.statusCode} (${ms}ms)`);
  });

  next();
}
