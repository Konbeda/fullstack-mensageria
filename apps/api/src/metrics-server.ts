import { createServer, type Server } from 'node:http';
import type { Metrics } from '@mensageria/observability';

// Métricas ficam numa porta interna separada (segregação) e, opcionalmente, atrás de um
// Bearer token. Nunca são expostas na porta pública da API.
export function startMetricsServer(port: number, metrics: Metrics, token?: string): Server {
  const server = createServer((req, res) => {
    if (req.url !== '/metrics') {
      res.writeHead(404).end();
      return;
    }
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401).end();
      return;
    }
    void metrics.registry
      .metrics()
      .then((text) => {
        res.writeHead(200, { 'content-type': metrics.registry.contentType });
        res.end(text);
      })
      .catch(() => res.writeHead(500).end());
  });
  server.listen(port);
  return server;
}
