const defaultOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:18080',
  'http://127.0.0.1:18080',
  'https://f74d-2804-d47-563d-7000-35cf-67f5-9585-e095.ngrok-free.app',
];

export function allowedFrontendOrigins(configured = process.env.FRONTEND_ORIGINS ?? ''): string[] {
  const extra = configured.split(',').map((origin) => origin.trim()).filter(Boolean);
  for (const origin of extra) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new Error('FRONTEND_ORIGINS deve conter origens HTTP(S) válidas.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
      throw new Error('FRONTEND_ORIGINS deve conter apenas origens HTTP(S), sem caminhos ou credenciais.');
    }
  }
  return [...new Set([...defaultOrigins, ...extra])];
}

export function corsOptions() {
  return {
    origin: allowedFrontendOrigins(),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'ngrok-skip-browser-warning'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}
