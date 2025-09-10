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
app.use(cors());
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

app.use('/api/users', createProxyMiddleware({ target: USERS_URL, changeOrigin: true, pathRewrite: {'^/api/users':''} }));
app.use('/api/products', createProxyMiddleware({ target: PRODUCTS_URL, changeOrigin: true, pathRewrite: {'^/api/products':''} }));
app.use('/api/orders', createProxyMiddleware({ target: ORDERS_URL, changeOrigin: true, pathRewrite: {'^/api/orders':''} }));

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));