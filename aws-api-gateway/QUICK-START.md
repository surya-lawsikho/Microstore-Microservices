# AWS API Gateway Integration Types - Quick Start Guide

## 🚀 5-Minute Quick Start

### Step 1: Install Dependencies (First Time Only)

```bash
cd aws-api-gateway
npm install
```

### Step 2: Start Microservices

Open 3 terminals and run:

```bash
# Terminal 1
cd user-service
npm run dev

# Terminal 2
cd product-service
npm run dev

# Terminal 3
cd order-service
npm run dev
```

### Step 3: Start API Gateway

Open a 4th terminal:

```bash
cd aws-api-gateway
npm run offline
```

API Gateway will start at: **http://localhost:3000**

### Step 4: Test Integrations

```bash
# Test Lambda Proxy (existing gateway)
curl http://localhost:3000/health

# Test Lambda Non-Proxy
curl http://localhost:3000/integrations/non-proxy/products

# Test Mock Integration
curl http://localhost:3000/integrations/mock/products

# Test AWS Service (DynamoDB)
curl -X POST http://localhost:3000/integrations/dynamodb/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":99.99,"stock":50,"category":"test"}'

# Run all automated tests
npm run test:integrations
```

---

## 📚 What Integration Types Are Available?

| Type | Endpoint Pattern | Working Locally? |
|------|------------------|------------------|
| **Lambda Proxy** | `/api/*`, `/health` | ✅ Yes |
| **Lambda Non-Proxy** | `/integrations/non-proxy/*` | ✅ Yes |
| **HTTP Proxy/Non-Proxy** | `/integrations/http-*/*` | ⚠️ AWS only |
| **AWS Services (DynamoDB)** | `/integrations/dynamodb/*` | ✅ Yes |
| **AWS Services (SNS)** | `/integrations/sns/*` | ✅ Yes |
| **AWS Services (SQS)** | `/integrations/sqs/*` | ✅ Yes |
| **Mock** | `/integrations/mock/*` | ✅ Yes |
| **Transformations** | `/integrations/transform/*` | ✅ Yes |
| **VPC Link** | `/integrations/vpc-link/*` | ⚠️ AWS only |

---

## 🎯 Try These Examples

### 1. Lambda Proxy (Original Gateway)

```bash
# Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"Demo123!"}'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"Demo123!"}'

# Get products
curl http://localhost:3000/api/products
```

### 2. Lambda Non-Proxy (with Transformations)

```bash
# List products with automatic transformation
curl http://localhost:3000/integrations/non-proxy/products?category=electronics

# Response includes metadata added by API Gateway!
```

### 3. AWS Service Integration (DynamoDB)

```bash
# Create product directly in DynamoDB
curl -X POST http://localhost:3000/integrations/dynamodb/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999.99,"stock":50,"category":"electronics"}'

# Get product from DynamoDB
curl http://localhost:3000/integrations/dynamodb/products/YOUR_PRODUCT_ID

# Query by category
curl http://localhost:3000/integrations/dynamodb/products/query?category=electronics
```

### 4. AWS Service Integration (SNS)

```bash
# Publish notification
curl -X POST http://localhost:3000/integrations/sns/publish \
  -H "Content-Type: application/json" \
  -d '{"event":"test","subject":"Test Notification","data":{"message":"Hello"}}'
```

### 5. Mock Integration

```bash
# Get mock data (no backend needed)
curl http://localhost:3000/integrations/mock/products
curl http://localhost:3000/integrations/mock/health
```

### 6. Transformations

```bash
# Request enrichment
curl -X POST http://localhost:3000/integrations/transform/enrich \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'

# Pagination
curl http://localhost:3000/integrations/transform/pagination?page=1&limit=5
```

---

## 🧪 Run Automated Tests

```bash
cd aws-api-gateway
npm run test:integrations
```

This will test all integration types and show a beautiful report!

---

## ☁️ Deploy to AWS

```bash
# Deploy API Gateway
cd aws-api-gateway
npm run deploy:dev

# Deploy VPC Link (optional)
npm run deploy:vpc
```

---

## 📖 Learn More

### Essential Docs (Read in Order)
1. **INTEGRATION-TYPES-GUIDE.md** - Complete guide (read this first!)
2. **INTEGRATION-ENDPOINTS.md** - Quick endpoint reference
3. **IMPLEMENTATION-SUMMARY.md** - What's been implemented
4. **README.md** - Full project documentation

### Code to Explore
1. **src/handler.js** - Lambda Proxy integration (original)
2. **src/integrations.js** - All other integrations
3. **mapping-templates/** - VTL transformation templates
4. **serverless.yml** - Configuration
5. **vpc-link-cloudformation.yml** - VPC Link infrastructure

---

## 🔍 What Makes Each Integration Type Different?

### Lambda Proxy
```
Client → API Gateway → Lambda (handles everything)
```
- **You control**: Everything
- **Lambda receives**: Full HTTP request
- **Lambda returns**: statusCode + headers + body

### Lambda Non-Proxy
```
Client → API Gateway (transforms) → Lambda (business logic)
```
- **API Gateway handles**: HTTP formatting
- **Lambda receives**: Clean, simple data
- **Lambda returns**: Just the data

### HTTP Integration
```
Client → API Gateway → HTTP Backend (direct)
```
- **No Lambda**: Lower cost
- **Direct call**: To any HTTP endpoint

### AWS Service Integration
```
Client → API Gateway → DynamoDB/SNS/SQS (direct)
```
- **No Lambda**: Even lower cost
- **Direct call**: To AWS services

### VPC Link
```
Client → API Gateway → VPC Link → NLB → Private Service
```
- **Private access**: Services never exposed publicly
- **Security**: VPC isolation

---

## 💡 Quick Tips

### Which Integration Type Should I Use?

**Need full control?** → Lambda Proxy  
**Want simpler Lambda code?** → Lambda Non-Proxy  
**Have HTTP backend?** → HTTP Integration  
**Simple CRUD with DynamoDB?** → AWS Service Integration  
**Private VPC services?** → VPC Link  
**Testing/prototyping?** → Mock Integration

### Common Issues

**"Connection refused"** → Make sure microservices are running
**"401 Unauthorized"** → You need to login and use the access token
**"Table does not exist"** → Deploy to AWS or use DynamoDB Local
**"HTTP integration not working"** → HTTP integrations require AWS deployment

---

## 🎓 Learning Path

### Beginner (30 minutes)
1. ✅ Start services and API Gateway
2. ✅ Test Lambda Proxy endpoints
3. ✅ Try Mock integration
4. ✅ Read INTEGRATION-TYPES-GUIDE.md (overview section)

### Intermediate (2 hours)
1. ✅ Test Lambda Non-Proxy
2. ✅ Explore VTL mapping templates
3. ✅ Try AWS Service integrations
4. ✅ Run automated tests
5. ✅ Read full INTEGRATION-TYPES-GUIDE.md

### Advanced (1 day)
1. ✅ Deploy to AWS
2. ✅ Test HTTP integrations
3. ✅ Deploy VPC Link
4. ✅ Create custom mapping templates
5. ✅ Set up monitoring

---

## 🎉 You're Ready!

You now have **all 7 AWS API Gateway integration types** implemented and ready to explore!

### Start Here:
```bash
cd aws-api-gateway
npm run test:integrations
```

Then explore the docs in this order:
1. **INTEGRATION-TYPES-GUIDE.md** ← Start here!
2. **INTEGRATION-ENDPOINTS.md**
3. **IMPLEMENTATION-SUMMARY.md**

**Happy learning! 🚀**

---

## 📞 Need Help?

- Check **README.md** for troubleshooting
- Review **INTEGRATION-TYPES-GUIDE.md** for concepts
- See **INTEGRATION-ENDPOINTS.md** for endpoint examples
- Look at **mapping-templates/** for VTL examples

---

## ✨ Quick Commands Cheat Sheet

```bash
# Start API Gateway locally
npm run offline

# Run all integration tests
npm run test:integrations

# Deploy to AWS (dev)
npm run deploy:dev

# Deploy to AWS (prod)
npm run deploy:prod

# Deploy VPC Link
npm run deploy:vpc

# View logs
npm run logs

# Remove from AWS
npm run remove
```

---

**Ready to explore? Start with the integration tests:**

```bash
npm run test:integrations
```

🎊 **Enjoy exploring all 7 integration types!**

