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
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

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
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    
    const userRepository = AppDataSource.getRepository(User);
    const exists = await userRepository.findOne({ where: { username } });
    if (exists) return res.status(409).json({ error: 'username taken' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedRole = role === 'admin' ? 'admin' : 'user';
    const user = userRepository.create({ username, passwordHash, role: normalizedRole });
    const savedUser = await userRepository.save(user);
    
    res.status(201).json({ id: savedUser.id, username: savedUser.username, role: savedUser.role });
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
    
    const accessToken = jwt.sign({ sub: user.id, username: user.username, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await userRepository.update({ id: user.id }, { refreshTokenHash });

    res.json({ accessToken, refreshToken, user: { id: user.id, username: user.username, role: user.role } });
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
    req.user = jwt.verify(token, ACCESS_TOKEN_SECRET);
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
      select: ['id', 'username', 'role', 'createdAt']
    });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Refresh token endpoint
app.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'invalid refresh token' });
    }

    if (payload.type !== 'refresh') return res.status(401).json({ error: 'invalid refresh token' });

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) return res.status(401).json({ error: 'invalid refresh token' });

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) return res.status(401).json({ error: 'invalid refresh token' });

    // Rotate refresh token
    const newRefreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await userRepository.update({ id: user.id }, { refreshTokenHash: newRefreshTokenHash });

    const accessToken = jwt.sign({ sub: user.id, username: user.username, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logout - invalidate refresh token
app.post('/logout', auth, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.update({ id: req.user.sub }, { refreshTokenHash: null });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.listen(PORT, () => console.log(`User service on ${PORT}`));
