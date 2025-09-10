import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DataSource } from "typeorm";
import "reflect-metadata";
import User from './models/User.js';

dotenv.config();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Database configuration
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "microstore_users",
  synchronize: true,
  logging: false,
  entities: [User],
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

app.get('/health', (_, res) => res.json({ ok: true, service: 'user-service' }));

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log("User PostgreSQL connected");
  })
  .catch((error) => {
    console.error("Database error", error);
    process.exit(1);
  });

// Auth routes
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    
    const userRepository = AppDataSource.getRepository(User);
    const exists = await userRepository.findOne({ where: { username } });
    if (exists) return res.status(409).json({ error: 'username taken' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = userRepository.create({ username, passwordHash });
    const savedUser = await userRepository.save(user);
    
    res.status(201).json({ id: savedUser.id, username: savedUser.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { username } });
    
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    
    const token = jwt.sign({ sub: user.id, username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Auth middleware
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const [, token] = h.split(' ');
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/me', auth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ 
      where: { id: req.user.sub },
      select: ['id', 'username', 'createdAt']
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.listen(PORT, () => console.log(`User service on ${PORT}`));
