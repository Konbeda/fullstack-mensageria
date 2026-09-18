import { createServer, type Server } from 'node:http';
import type { Metrics } from '@mensageria/observability';

export function startHealthServer(port: number, metrics?: Metrics): Server {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (req.url === '/metrics' && metrics) {
      void metrics.registry
        .metrics()
        .then((text) => {
          res.writeHead(200, { 'content-type': metrics.registry.contentType });
          res.end(text);
        })
        .catch(() => res.writeHead(500).end());
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
