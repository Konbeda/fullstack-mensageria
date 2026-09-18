import { createServer, type Server } from 'node:http';

export function startHealthServer(port: number): Server {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
