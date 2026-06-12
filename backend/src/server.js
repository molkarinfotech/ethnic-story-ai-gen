const http = require('http');

const products = [
  { id: 'p1', name: 'Banarasi Saree', slug: 'banarasi-saree', priceInr: 12999, currency: 'INR', category: 'saree', inStock: true },
  { id: 'p2', name: 'Embroidered Lehenga', slug: 'embroidered-lehenga', priceInr: 18999, currency: 'INR', category: 'lehenga', inStock: true },
  { id: 'p3', name: 'Silk Anarkali Kurta', slug: 'silk-anarkali-kurta', priceInr: 6999, currency: 'INR', category: 'kurta', inStock: true },
  { id: 'p4', name: 'Chanderi Dupatta Set', slug: 'chanderi-dupatta-set', priceInr: 4999, currency: 'INR', category: 'saree', inStock: true },
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/api/products' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(products));
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, service: 'ethnic-story-api' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
