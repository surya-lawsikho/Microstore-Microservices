# API Gateway Integration Endpoints Reference

## Quick Reference

This document provides a quick reference for all integration endpoints in the MicroStore API Gateway POC.

## Base URL

**Local Development**: `http://localhost:3000`  
**AWS Deployment**: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`

---

## 1. Lambda Proxy Integration (Original Gateway)

### Public Endpoints

```bash
# Health Check
GET /health

# User Registration
POST /api/users/register
Body: {"username": "user", "password": "pass123"}

# User Login
POST /api/users/login
Body: {"username": "user", "password": "pass123"}

# Refresh Token
POST /api/users/refresh-token
Body: {"refreshToken": "your-refresh-token"}

# List Products (Public)
GET /api/products
```

### Protected Endpoints (Require Authorization Header)

```bash
# Get Current User
GET /api/users/me
Header: Authorization: Bearer {access-token}

# Logout
POST /api/users/logout
Header: Authorization: Bearer {access-token}

# Create Product (Admin Only)
POST /api/products
Header: Authorization: Bearer {access-token}
Body: {"name": "Product", "price": 99.99, "stock": 100}

# Update Product (Admin Only)
PUT /api/products/{id}
Header: Authorization: Bearer {access-token}
Body: {"name": "Updated Product", "price": 89.99}

# Delete Product (Admin Only)
DELETE /api/products/{id}
Header: Authorization: Bearer {access-token}

# Create Order
POST /api/orders
Header: Authorization: Bearer {access-token}
Body: {"items": [{"productId": "1", "qty": 2}]}

# Get User Orders
GET /api/orders
Header: Authorization: Bearer {access-token}
```

---

## 2. Lambda Non-Proxy Integration

These endpoints demonstrate Lambda functions with API Gateway request/response transformations using VTL (Velocity Template Language).

```bash
# Get Product (with transformation)
GET /integrations/non-proxy/products/{id}
# Response includes metadata added by API Gateway

# List Products (with filters)
GET /integrations/non-proxy/products?category=electronics&limit=10
# Request transformed before reaching Lambda

# Process Order (Protected)
POST /integrations/non-proxy/orders
Header: Authorization: Bearer {access-token}
Body: {"items": [{"productId": "1", "quantity": 2, "price": 99.99}], "total": 199.98}
# Request enriched with user context from authorizer
```

### How It Works

1. **Request**: API Gateway transforms using `lambda-non-proxy-request.vtl`
   - Adds metadata (requestId, timestamp, sourceIp)
   - Extracts user context from authorizer
   - Simplifies query parameters
   
2. **Lambda**: Receives clean, transformed input (no HTTP details)
   - Returns simple data (no statusCode/headers)
   
3. **Response**: API Gateway wraps using `lambda-non-proxy-response.vtl`
   - Adds success/error wrapper
   - Includes metadata
   - Formats for API consumers

---

## 3. AWS Service Integration

Direct integration with AWS services (no Lambda proxy).

### DynamoDB Integration

```bash
# Get Item from DynamoDB
GET /integrations/dynamodb/products/{id}
# Direct DynamoDB GetItem operation

# Put Item to DynamoDB
POST /integrations/dynamodb/products
Body: {
  "name": "New Product",
  "description": "Product description",
  "price": 49.99,
  "stock": 100,
  "category": "electronics"
}
# Direct DynamoDB PutItem operation

# Query Items by Category
GET /integrations/dynamodb/products/query?category=electronics
# Direct DynamoDB Query operation using CategoryIndex
```

**Mapping Templates Used**:
- Request: `dynamodb-get-request.vtl`, `dynamodb-put-request.vtl`
- Response: `dynamodb-get-response.vtl`, `dynamodb-put-response.vtl`

### SNS Integration

```bash
# Publish Notification to SNS Topic
POST /integrations/sns/publish
Body: {
  "event": "order_created",
  "subject": "New Order Notification",
  "data": {"orderId": "123", "total": 99.99},
  "priority": "high"
}
# Direct SNS Publish operation
```

**Mapping Templates Used**:
- Request: `sns-publish-request.vtl`
- Response: `sns-publish-response.vtl`

### SQS Integration

```bash
# Send Message to SQS Queue
POST /integrations/sqs/send
Body: {
  "type": "order_event",
  "payload": {"orderId": "123", "status": "pending"},
  "delaySeconds": 0
}
# Direct SQS SendMessage operation
```

**Mapping Templates Used**:
- Request: `sqs-send-request.vtl`
- Response: `sqs-send-response.vtl`

---

## 4. HTTP Integration

Direct HTTP integration (connects to HTTP backends without Lambda).

### HTTP Proxy Integration

```bash
# Note: HTTP Proxy endpoints require AWS deployment
# They don't work in serverless-offline mode

# Direct Product Service Call
GET /integrations/http-proxy/products
# Passes request directly to http://products-service/products

# Direct User Service Call
GET /integrations/http-proxy/users
# Passes request directly to http://users-service/users
```

### HTTP Non-Proxy Integration

```bash
# Note: HTTP Non-Proxy endpoints require AWS deployment

# HTTP Backend with Request Transformation
GET /integrations/http-non-proxy/products?category=electronics
# Transforms request using http-backend-request.vtl before calling backend

# HTTP Backend with Response Transformation
POST /integrations/http-non-proxy/products
Body: {"name": "Product", "price": 99.99}
# Transforms response using http-backend-response.vtl after backend responds
```

**Mapping Templates Used**:
- Request: `http-backend-request.vtl`
- Response: `http-backend-response.vtl`

---

## 5. Mock Integration

Returns mock data directly from API Gateway (no backend call).

```bash
# Mock Health Check
GET /integrations/mock/health
# Returns: {"status": "healthy", "mock": true, ...}

# Mock Products List
GET /integrations/mock/products
# Returns: {"products": [...], "mock": true}
```

**Use Cases**:
- API prototyping
- Frontend development before backend ready
- Testing
- Documentation examples

---

## 6. Transformation Examples

Demonstrates advanced request/response transformations.

```bash
# Request Enrichment
POST /integrations/transform/enrich
Body: {"action": "test", "data": {"key": "value"}}
# Enriches request with:
# - requestId, timestamp, sourceIp, userAgent
# - User context from authorizer
# - AWS region, stage

# Response Pagination
GET /integrations/transform/pagination?page=1&limit=10
# Adds pagination metadata:
# - total, hasMore, totalPages
# - HATEOAS links (self, next, prev)
```

---

## 7. VPC Link Integration

Connects to private VPC resources via Network Load Balancer.

```bash
# Note: VPC Link endpoints require:
# 1. VPC infrastructure deployed (npm run deploy:vpc)
# 2. Services running in private VPC
# 3. API Gateway deployed to AWS

# Call Private VPC Service
GET /integrations/vpc-link/health
# Routes through VPC Link → NLB → Private Service
```

**Architecture**:
```
API Gateway → VPC Link → Network Load Balancer → Private Subnet → Microservice
```

---

## Testing Workflows

### 1. Basic Flow (Lambda Proxy)

```bash
# Step 1: Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'

# Step 2: Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'
# Save accessToken from response

# Step 3: Get products
curl http://localhost:3000/api/products

# Step 4: Create order (use token from step 2)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"items":[{"productId":"1","qty":2}]}'
```

### 2. Non-Proxy Transformation Flow

```bash
# Step 1: Login and get token (same as above)

# Step 2: Test non-proxy transformation
curl http://localhost:3000/integrations/non-proxy/products?category=electronics

# Step 3: Process order with transformations
curl -X POST http://localhost:3000/integrations/non-proxy/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"items":[{"productId":"1","quantity":2,"price":99.99}],"total":199.98}'
# Notice: Response includes metadata added by API Gateway transformation
```

### 3. AWS Service Integration Flow

```bash
# Step 1: Create product in DynamoDB
curl -X POST http://localhost:3000/integrations/dynamodb/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":49.99,"stock":100,"category":"test"}'
# Save the product ID from response

# Step 2: Get product from DynamoDB
curl http://localhost:3000/integrations/dynamodb/products/YOUR_PRODUCT_ID

# Step 3: Query products by category
curl http://localhost:3000/integrations/dynamodb/products/query?category=test

# Step 4: Publish notification
curl -X POST http://localhost:3000/integrations/sns/publish \
  -H "Content-Type: application/json" \
  -d '{"event":"test","subject":"Test","data":{"message":"Hello"}}'

# Step 5: Send message to queue
curl -X POST http://localhost:3000/integrations/sqs/send \
  -H "Content-Type: application/json" \
  -d '{"type":"test_event","payload":{"data":"test"}}'
```

### 4. Mock & Transformation Flow

```bash
# Mock responses (always available)
curl http://localhost:3000/integrations/mock/health
curl http://localhost:3000/integrations/mock/products

# Request enrichment
curl -X POST http://localhost:3000/integrations/transform/enrich \
  -H "Content-Type: application/json" \
  -d '{"action":"test","data":{"key":"value"}}'

# Pagination
curl "http://localhost:3000/integrations/transform/pagination?page=1&limit=5"
```

---

## Automated Testing

Run the comprehensive integration test suite:

```bash
# Test all integration types
cd aws-api-gateway
npm run test:integrations

# Test basic functionality
npm run test
```

The test suite automatically tests:
- ✅ Lambda Proxy Integration
- ✅ Lambda Non-Proxy Integration
- ✅ AWS Service Integration (DynamoDB, SNS, SQS)
- ✅ Mock Integration
- ✅ Transformation Examples
- ⚠️ HTTP Integration (requires AWS deployment)
- ⚠️ VPC Link (requires AWS deployment)
- ✅ Error Handling

---

## Integration Type Decision Matrix

| Need | Use Integration Type |
|------|---------------------|
| Full control, complex logic | **Lambda Proxy** |
| Transform at gateway, simple Lambda | **Lambda Non-Proxy** |
| Direct HTTP backend, pass-through | **HTTP Proxy** |
| HTTP backend, need transformation | **HTTP Non-Proxy** |
| Simple CRUD with DynamoDB | **AWS Service (DynamoDB)** |
| Publish events to SNS/SQS | **AWS Service (SNS/SQS)** |
| Private VPC resources | **VPC Link** |
| Testing, prototyping | **Mock** |

---

## Response Format Examples

### Lambda Proxy Response
```json
{
  "id": "123",
  "name": "Product Name",
  "price": 99.99
}
```

### Lambda Non-Proxy Response (with transformation)
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Product Name",
    "price": 99.99
  },
  "metadata": {
    "requestId": "abc-123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/integrations/non-proxy/products/123",
    "method": "GET"
  }
}
```

### AWS Service Response (DynamoDB)
```json
{
  "found": true,
  "data": {
    "id": "123",
    "name": "Product Name",
    "price": 99.99,
    "category": "electronics",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "metadata": {
    "requestId": "abc-123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Transformation Response (Pagination)
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "hasMore": true,
    "totalPages": 5
  },
  "links": {
    "self": "/integrations/transform/pagination?page=1&limit=10",
    "next": "/integrations/transform/pagination?page=2&limit=10",
    "prev": null
  }
}
```

---

## Environment Variables

```bash
# Required for local testing
USERS_URL=http://localhost:3001
PRODUCTS_URL=http://localhost:3002
ORDERS_URL=http://localhost:3003
ACCESS_TOKEN_SECRET=your_secret

# Required for AWS deployment
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Optional for AWS service integrations
PRODUCTS_TABLE=MicroStore-Products-dev
SNS_TOPIC_ARN=arn:aws:sns:region:account:topic
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue
```

---

## Additional Resources

- **[INTEGRATION-TYPES-GUIDE.md](INTEGRATION-TYPES-GUIDE.md)** - Comprehensive integration types guide
- **[README.md](README.md)** - Main project documentation
- **[vpc-link-cloudformation.yml](vpc-link-cloudformation.yml)** - VPC Link infrastructure
- **[mapping-templates/](mapping-templates/)** - VTL transformation templates
- **[src/integrations.js](src/integrations.js)** - Integration handler implementations

---

## Quick Start

```bash
# 1. Start microservices
cd user-service && npm run dev &
cd product-service && npm run dev &
cd order-service && npm run dev &

# 2. Start API Gateway
cd aws-api-gateway
npm install
npm run offline

# 3. Test integrations
npm run test:integrations

# 4. Try endpoints
curl http://localhost:3000/health
curl http://localhost:3000/integrations/mock/products
curl http://localhost:3000/integrations/non-proxy/products
```

Enjoy exploring AWS API Gateway integration types! 🚀

