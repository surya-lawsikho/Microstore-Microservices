import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const USERS_URL = process.env.USERS_URL || 'http://localhost:3001';
const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://localhost:3002';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3003';

const app = express();

// CORS configuration - More permissive for development
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle CORS universally and short-circuit preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(morgan('dev'));

// Load Swagger specification
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MicroStore API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
  }
}));

// Serve raw Swagger YAML
app.get('/swagger.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(path.join(__dirname, '../swagger.yaml'));
});

app.get('/health', (_, res) => res.json({ ok: true, service: 'gateway' }));

app.use('/api/users', createProxyMiddleware({ 
  target: USERS_URL, 
  changeOrigin: true, 
  pathRewrite: {'^/api/users':''},
  onProxyReq: (proxyReq, req, res) => {
    // Add CORS headers to proxy requests
    proxyReq.setHeader('Origin', USERS_URL);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are passed through
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  },
  onError: (err, req, res) => {
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({ error: 'proxy_error', service: 'users', details: err.code || err.message }));
  }
}));

app.use('/api/products', createProxyMiddleware({ 
  target: PRODUCTS_URL, 
  changeOrigin: true, 
  pathRewrite: {'^/api/products':''},
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Origin', PRODUCTS_URL);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  },
  onError: (err, req, res) => {
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({ error: 'proxy_error', service: 'products', details: err.code || err.message }));
  }
}));

app.use('/api/orders', createProxyMiddleware({ 
  target: ORDERS_URL, 
  changeOrigin: true, 
  pathRewrite: {'^/api/orders':''},
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Origin', ORDERS_URL);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  },
  onError: (err, req, res) => {
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({ error: 'proxy_error', service: 'orders', details: err.code || err.message }));
  }
}));

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));