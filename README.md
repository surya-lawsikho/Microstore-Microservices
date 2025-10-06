# Microstore Microservices

A microservices-based e-commerce application built with Node.js, Express, TypeORM, and PostgreSQL.

## Architecture

- **Frontend** (Port 3000): React application with Redux Toolkit for state management
- **Gateway Service** (Port 8080 by default): API Gateway that routes requests to appropriate services
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
PORT=8080 # Ensure this matches the port your frontend calls
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
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
```

### Product Service (.env)
```env
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=microstore_products
ACCESS_TOKEN_SECRET=your_access_secret
```

### Order Service (.env)
```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=microstore_orders
ACCESS_TOKEN_SECRET=your_access_secret
PRODUCT_SERVICE_URL=http://localhost:3002
```

## Installation

1. Install dependencies for all services:
   ```bash
   cd gateway && npm install
   cd ../user-service && npm install
   cd ../product-service && npm install
   cd ../order-service && npm install
   cd ../frontend && npm install
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

### Terminal 5 - Frontend
```bash
cd frontend
npm start
```

## Run with AWS API Gateway (Local Lambda via Serverless Offline)

Run the Lambda-based gateway that proxies to your local services.

### 1) Install dependencies (first time only)
```bash
cd aws-api-gateway
npm install
```

### 2) Start microservices (in separate terminals)
```bash
cd user-service && npm run dev
```
```bash
cd product-service && npm run dev
```
```bash
cd order-service && npm run dev
```

### 3) Start Serverless Offline (Lambda API)
```bash
cd aws-api-gateway
npx serverless offline --httpPort 3008 --host 0.0.0.0
```

The Lambda API will be available at: http://127.0.0.1:3008

### 4) Optional – Deploy to AWS
```bash
cd aws-api-gateway
serverless deploy --stage dev
```

## Quick cURL Tests (via Lambda API on http://127.0.0.1:3008)

Health:
```bash
curl http://127.0.0.1:3008/health
```

Register user:
```bash
curl -X POST http://127.0.0.1:3008/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}'
```

Login and capture tokens (bash):
```bash
ACCESS_TOKEN=$(curl -s -X POST http://127.0.0.1:3008/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}' | jq -r .accessToken)

REFRESH_TOKEN=$(curl -s -X POST http://127.0.0.1:3008/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}' | jq -r .refreshToken)
```

Get current user:
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://127.0.0.1:3008/api/users/me
```

List products:
```bash
curl http://127.0.0.1:3008/api/products
```

Create order (replace PRODUCT_ID):
```bash
curl -X POST http://127.0.0.1:3008/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"items":[{"productId":"PRODUCT_ID","qty":1}]}'
```

## API Endpoints

### Gateway (http://localhost:8080)
- `GET /health` - Health check
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user (requires auth)
- `POST /api/users/refresh-token` - Refresh access token
- `POST /api/users/logout` - Logout and invalidate refresh token
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin only)
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
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
2. **Port Conflicts**: Check if the required ports (3000, 8080, 3001, 3002, 3003) are available
3. **Environment Variables**: Verify all `.env` files are properly configured
4. **Dependencies**: Run `npm install` in each service directory if you encounter module errors

## Frontend Application

The React frontend application provides a modern, responsive user interface for the MicroStore application.

### Features
- **User Authentication**: Registration and login with JWT tokens
- **Refresh Tokens**: Automatic token refresh on expiry, auto-logout on failure
- **Product Catalog**: Browse, search, and filter products
- **Shopping Cart**: Add/remove items with real-time updates
- **Order Management**: View order history and place new orders
- **Admin Panel**: Manage products (create/update/delete) at `/admin` (admin role only)
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error handling with retry logic
- **State Management**: Redux Toolkit for predictable state management
- **Currency**: Prices displayed in INR (₹), Indian grouping via `Intl.NumberFormat('en-IN')`

### Access
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080

### Technology Stack
- React 18 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Tailwind CSS for styling
- Axios for API communication

## Swagger

To run Swagger Api: http://localhost:8080/api-docs/

## Role-Based Access & Admin Setup

- Product mutations are admin-only. To create an admin user:
  - Register via gateway with role:
    ```bash
    curl -X POST http://localhost:8080/api/users/register \
      -H "Content-Type: application/json" \
      -d '{"username":"admin1","password":"Your$trongPass123","role":"admin"}'
    ```
  - Login at `/login`, then open `/admin`.

## Common Troubleshooting

- 401 Unauthorized on product create/update:
  - Ensure all services share the same `ACCESS_TOKEN_SECRET`.
  - Restart user-service, product-service, and order-service after changing secrets.
  - Log out and log back in to obtain a fresh access token.

- 502 Bad Gateway from frontend:
  - Start gateway and all upstream services; 502 indicates the upstream was down.
