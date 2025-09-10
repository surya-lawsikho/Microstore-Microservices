# Microstore Microservices

A microservices-based e-commerce application built with Node.js, Express, TypeORM, and PostgreSQL.

## Architecture

- **Gateway Service** (Port 8080): API Gateway that routes requests to appropriate services
- **User Service** (Port 3001): Handles user authentication and management
- **Product Service** (Port 3002): Manages product catalog
- **Order Service** (Port 3003): Handles order processing

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Database Setup

1. Install PostgreSQL on your system
2. Create three databases:
   ```sql
   CREATE DATABASE microstore_users;
   CREATE DATABASE microstore_products;
   CREATE DATABASE microstore_orders;
   ```

## Environment Configuration

Create `.env` files in each service directory:

### Gateway (.env)
```env
PORT=8080
USERS_URL=http://localhost:3001
PRODUCTS_URL=http://localhost:3002
ORDERS_URL=http://localhost:3003
```

### User Service (.env)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=microstore_users
JWT_SECRET=your_jwt_secret
```

### Product Service (.env)
```env
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=microstore_products
```

### Order Service (.env)
```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=microstore_orders
JWT_SECRET=your_jwt_secret
PRODUCT_SERVICE_URL=http://localhost:3002
```

## Installation

1. Install dependencies for all services:
   ```bash
   cd gateway && npm install
   cd ../user-service && npm install
   cd ../product-service && npm install
   cd ../order-service && npm install
   ```

## Running the Application

Start each service in separate terminals:

### Terminal 1 - Gateway
```bash
cd gateway
npm run dev
```

### Terminal 2 - User Service
```bash
cd user-service
npm run dev
```

### Terminal 3 - Product Service
```bash
cd product-service
npm run dev
```

### Terminal 4 - Order Service
```bash
cd order-service
npm run dev
```

## API Endpoints

### Gateway (http://localhost:8080)
- `GET /health` - Health check
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user (requires auth)
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/orders` - Create order (requires auth)
- `GET /api/orders` - Get user orders (requires auth)

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `username` (String, Unique)
- `passwordHash` (String)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### Products Table
- `id` (UUID, Primary Key)
- `name` (String)
- `price` (Decimal)
- `stock` (Integer)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### Orders Table
- `id` (UUID, Primary Key)
- `userId` (String)
- `items` (JSON Array)
- `total` (Decimal)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

## Development

- All services use TypeORM for database operations
- PostgreSQL is used as the primary database
- JWT is used for authentication
- Services communicate via HTTP REST APIs
- The gateway provides a unified API interface

## Troubleshooting

1. **Database Connection Issues**: Ensure PostgreSQL is running and the databases are created
2. **Port Conflicts**: Check if the required ports (8080, 3001, 3002, 3003) are available
3. **Environment Variables**: Verify all `.env` files are properly configured
4. **Dependencies**: Run `npm install` in each service directory if you encounter module errors

## Swagger

To run Swagger Api: http://localhost:8080/api-docs/
