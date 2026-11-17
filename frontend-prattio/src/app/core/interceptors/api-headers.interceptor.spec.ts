import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiHeadersInterceptor } from './api-headers.interceptor';

describe('apiHeadersInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiHeadersInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('sets Accept for API requests without overriding authorization or multipart headers', () => {
    http.post('/api/upload', new FormData(), { headers: { Authorization: 'Bearer test-token' } }).subscribe();
    const request = requests.expectOne('/api/upload');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({});
  });

  it('preserves explicit Accept and does not change external requests', () => {
    http.get('/api/report', { headers: { Accept: 'text/plain' }, responseType: 'text' }).subscribe();
    const report = requests.expectOne('/api/report');
    expect(report.request.headers.get('Accept')).toBe('text/plain');
    report.flush('report');
    http.get('https://example.test/data').subscribe();
    const external = requests.expectOne('https://example.test/data');
    expect(external.request.headers.has('Accept')).toBe(false);
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
  });
});
