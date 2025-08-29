import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import { DataSource } from "typeorm";
import "reflect-metadata";
import Product from './models/Product.js';
import productRoutes from './routes/products.js';

dotenv.config();
const PORT = process.env.PORT || 3002;

// Database configuration
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "microstore_products",
  synchronize: true,
  logging: false,
  entities: [Product],
  subscribers: [],
  migrations: [],
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log("Product PostgreSQL connected");
  })
  .catch((error) => {
    console.error("Database error", error);
    process.exit(1);
  });

// Make AppDataSource available to routes
app.use((req, res, next) => {
  req.AppDataSource = AppDataSource;
  next();
});

app.use('/', productRoutes);

app.listen(PORT, () => console.log(`Product service on ${PORT}`));
