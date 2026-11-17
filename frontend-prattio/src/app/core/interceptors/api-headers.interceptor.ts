import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';

export const apiHeadersInterceptor: HttpInterceptorFn = (request, next) => {
  const isApiRequest = request.url === API_BASE_URL || request.url.startsWith(`${API_BASE_URL}/`);
  if (!isApiRequest || request.headers.has('Accept')) return next(request);
  return next(request.clone({ setHeaders: { Accept: 'application/json' } }));
};
