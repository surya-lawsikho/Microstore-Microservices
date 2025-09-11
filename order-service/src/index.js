import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { DataSource } from "typeorm";
import "reflect-metadata";
import Order from './models/Order.js';

dotenv.config();
const PORT = process.env.PORT || 3003;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Database configuration
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "microstore_orders",
  synchronize: true,
  logging: false,
  entities: [Order],
  subscribers: [],
  migrations: [],
});

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log("Order PostgreSQL connected");
  })
  .catch((error) => {
    console.error("Database error", error);
    process.exit(1);
  });

app.get('/health', (_, res) => res.json({ ok: true, service: 'order-service' }));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const [, token] = h.split(' ');
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    req.user = jwt.verify(token, ACCESS_TOKEN_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

app.post('/', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    
    const pricedItems = [];
    for (const it of items) {
      const { data: product } = await axios.get(`${PRODUCT_SERVICE_URL}/${it.productId}`);
      pricedItems.push({
        productId: it.productId,
        qty: it.qty,
        priceAtPurchase: product.price
      });
    }
    
    const total = pricedItems.reduce((sum, it) => sum + it.qty * it.priceAtPurchase, 0);
    const orderRepository = AppDataSource.getRepository(Order);
    const order = orderRepository.create({ 
      userId: req.user.sub, 
      items: pricedItems, 
      total 
    });
    const savedOrder = await orderRepository.save(order);
    res.status(201).json(savedOrder);
  } catch (e) {
    if (e.response?.status === 404) return res.status(400).json({ error: 'invalid product id' });
    res.status(500).json({ error: e.message });
  }
});

app.get('/', auth, async (req, res) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const orders = await orderRepository.find({
      where: { userId: req.user.sub },
      order: { createdAt: 'DESC' }
    });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Order service on ${PORT}`));
