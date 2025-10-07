# AWS API Gateway POC for MicroStore

This directory contains the AWS API Gateway implementation for the MicroStore microservices project.

## Overview

This POC demonstrates how to use AWS API Gateway as a managed service to:
- Securely expose and manage APIs
- Route requests to backend microservices
- Handle CORS and authentication
- Monitor and log API usage
- Scale automatically

## Architecture

```
Client Request → AWS API Gateway → Lambda Function → Microservices
```

The API Gateway uses a Lambda function as a proxy to route requests to the appropriate microservices based on the URL path.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** (v18 or higher)
3. **Serverless Framework** installed globally:
   ```bash
   npm install -g serverless
   ```
4. **Running microservices** (user-service, product-service, order-service)

## Setup

1. **Install dependencies:**
   ```bash
   cd aws-api-gateway
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Configure AWS credentials:**
   ```bash
   aws configure
   # Or set environment variables:
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```

## Deployment

### Deploy to AWS

```bash
# Deploy to development stage
npm run deploy:dev

# Deploy to production stage
npm run deploy:prod

# Deploy with custom stage
serverless deploy --stage staging
```

### Local Development

```bash
# Start local server (simulates API Gateway)
npm run offline
```

The local server will be available at `http://localhost:3000`

## API Endpoints

Once deployed, your API Gateway will be available at:
```
https://your-api-id.execute-api.region.amazonaws.com/stage
```

### Available Endpoints

- `GET /health` - Health check
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user (requires auth)
- `POST /api/users/refresh-token` - Refresh access token
- `POST /api/users/logout` - Logout
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin only)
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
- `POST /api/orders` - Create order (requires auth)
- `GET /api/orders` - Get user orders (requires auth)

## Authorization with Lambda Authorizer

This POC uses a Lambda Authorizer (REQUEST type) to protect `/api/{proxy+}` by default while leaving specific routes public.

### Public (no auth)
- `GET /health`
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/refresh-token`
- `GET /api/products`

### Secured (authorizer)
- All other `/api/{proxy+}` routes require an `Authorization: Bearer <JWT>` header.

### Configure Secret
Set the JWT secret before deploying (must match user-service):
```
export ACCESS_TOKEN_SECRET=your_access_secret   # bash
$env:ACCESS_TOKEN_SECRET="your_access_secret"   # PowerShell
```

### Test Secured Routes
1) Login to obtain a JWT from `POST /api/users/login`.
2) Call a secured route with the token:
```
curl -H "Authorization: Bearer ACCESS_TOKEN" https://{apiId}.execute-api.{region}.amazonaws.com/dev/api/orders
```

## Event-Driven Triggers (POC)

- S3: `s3:ObjectCreated:*` on bucket `${stage}`-scoped bucket writes a marker under `processed/`.
- SQS: Consumer for queue `${stage}`-scoped queue, logs and deletes messages.
- Schedule: CloudWatch Events rule `rate(5 minutes)` triggers a heartbeat and optional warm-up.

### Configure Locally

Update `.env` (copy from `env.example`):

```
S3_BUCKET_NAME=microstore-poc-bucket-dev
SQS_QUEUE_NAME=microstore-poc-queue-dev
WARM_HEALTH_URL=http://localhost:3000/health
```

### Deploy Resources

Resources are defined in `serverless.yml` and created on deploy:

```
npm run deploy:dev
```

### Test S3 Trigger

After deploy, upload a file to the bucket shown in the output (or Console):

```
aws s3 cp sample.json s3://microstore-poc-bucket-dev/events/sample.json
```

Check Lambda logs:

```
serverless logs -f s3Processor -t
```

### Test SQS Trigger

Send a message to the queue:

```
aws sqs send-message --queue-url $(aws sqs get-queue-url --queue-name microstore-poc-queue-dev --query QueueUrl --output text) --message-body '{"type":"demo","ts":'"$(date +%s)"'}'
```

Tail logs:

```
serverless logs -f sqsConsumer -t
```

### Verify Scheduled Trigger

Tail scheduled function logs and wait up to 5 minutes:

```
serverless logs -f scheduledPing -t
```

## Configuration

### Environment Variables

- `USERS_URL` - URL of the user service
- `PRODUCTS_URL` - URL of the product service
- `ORDERS_URL` - URL of the order service
- `STAGE` - Deployment stage (dev, staging, prod)

### CORS Configuration

The API Gateway is configured to handle CORS for all origins. In production, you should restrict this to your specific domains.

## Monitoring and Logging

### CloudWatch Logs

View logs in AWS CloudWatch:
```bash
npm run logs
```

### API Gateway Metrics

Monitor your API in the AWS Console:
- Request count
- Latency
- Error rates
- Cache hit rates

## Testing

### Test the deployed API

```bash
# Health check
curl https://your-api-id.execute-api.region.amazonaws.com/dev/health

# Register a user
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/dev/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Login
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/dev/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### Test locally

```bash
# Start local server
npm run offline

# Test health endpoint
curl http://localhost:3000/health

# Test user registration
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

## Cleanup

To remove all AWS resources:

```bash
npm run remove
```

## Cost Optimization

- Use appropriate Lambda memory allocation
- Configure API Gateway caching for read-heavy endpoints
- Set up CloudWatch alarms for cost monitoring
- Use AWS Free Tier for development

## Security Considerations

1. **Authentication**: JWT tokens are passed through to microservices
2. **CORS**: Configured for development; restrict in production
3. **Rate Limiting**: Consider implementing API Gateway throttling
4. **Monitoring**: Set up CloudWatch alarms for security events

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if microservices are running
2. **CORS Errors**: Verify CORS configuration in serverless.yml
3. **Timeout Errors**: Increase Lambda timeout in serverless.yml
4. **Permission Errors**: Check AWS IAM permissions

### Debug Mode

Enable debug logging:
```bash
export SLS_DEBUG=*
serverless deploy
```

## Integration Types

This POC demonstrates **all 7 AWS API Gateway integration types**:

### ✅ Currently Implemented

1. **Lambda Proxy Integration** - Main gateway that routes to microservices
2. **Lambda Non-Proxy Integration** - Lambda with request/response transformations
3. **AWS Service Integration** - Direct DynamoDB, SNS, and SQS integrations
4. **Mock Integration** - Mock responses for testing
5. **Transform Examples** - Request enrichment and pagination
6. **Mapping Templates (VTL)** - Extensive Velocity Template examples

### 📚 Documentation & Configuration

- **HTTP Proxy/Non-Proxy** - Configured in serverless.yml (requires deployment)
- **VPC Link** - Complete CloudFormation template provided

### 📖 Learn More

For a comprehensive guide to all integration types, see:
- **[INTEGRATION-TYPES-GUIDE.md](INTEGRATION-TYPES-GUIDE.md)** - Complete integration types documentation
- Covers architecture, use cases, pros/cons, and examples for each type
- Includes VTL (Velocity Template Language) tutorial
- Comparison tables and decision matrix

## Testing Integration Types

### Run All Integration Tests

```bash
# Test all integration types
npm run test:integrations

# Test basic API functionality
npm run test
```

### Test Individual Integration Types

```bash
# Lambda Proxy (existing gateway)
curl http://localhost:3000/health
curl http://localhost:3000/api/products

# Lambda Non-Proxy (with transformations)
curl http://localhost:3000/integrations/non-proxy/products
curl http://localhost:3000/integrations/non-proxy/products/1

# AWS Service Integrations
curl http://localhost:3000/integrations/dynamodb/products/test-123
curl -X POST http://localhost:3000/integrations/sns/publish \
  -H "Content-Type: application/json" \
  -d '{"event":"test","subject":"Test","data":{"msg":"hello"}}'

# Mock Integrations
curl http://localhost:3000/integrations/mock/health
curl http://localhost:3000/integrations/mock/products

# Transformations
curl -X POST http://localhost:3000/integrations/transform/enrich \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'
curl http://localhost:3000/integrations/transform/pagination?page=1&limit=5
```

## VPC Link Setup (Optional)

To connect API Gateway to private VPC resources:

### 1. Deploy VPC Infrastructure

```bash
npm run deploy:vpc
```

This creates:
- VPC with public and private subnets
- Network Load Balancer (NLB)
- VPC Link for API Gateway
- Security groups and routing

### 2. Update Serverless Configuration

The VPC Link integration is pre-configured in `serverless.yml`. After deploying the VPC stack, deploy the API:

```bash
npm run deploy:dev
```

### 3. Test VPC Link

```bash
curl https://your-api-id.execute-api.region.amazonaws.com/dev/integrations/vpc-link/health
```

See `vpc-link-cloudformation.yml` for complete VPC Link configuration.

## Mapping Templates

Velocity Template Language (VTL) templates for request/response transformations are in `mapping-templates/`:

- `lambda-non-proxy-request.vtl` - Transform API Gateway request to Lambda input
- `lambda-non-proxy-response.vtl` - Wrap Lambda output in standard format
- `http-backend-request.vtl` - Transform for HTTP backends
- `http-backend-response.vtl` - Standardize HTTP backend responses
- `dynamodb-get-request.vtl` - Transform to DynamoDB GetItem format
- `dynamodb-get-response.vtl` - Transform DynamoDB response to JSON
- `dynamodb-put-request.vtl` - Transform to DynamoDB PutItem format
- `sns-publish-request.vtl` - Transform to SNS Publish format
- `sqs-send-request.vtl` - Transform to SQS SendMessage format
- `error-response.vtl` - Standardize error responses

These templates demonstrate:
- Context variable usage (`$context.requestId`, `$context.authorizer.*`)
- Input parsing (`$input.json()`, `$input.params()`)
- Conditional logic (`#if`, `#else`, `#end`)
- Loops (`#foreach`)
- Utility functions (`$util.escapeJavaScript()`, `$util.urlEncode()`)

## Next Steps

1. **Production Deployment**: Configure proper CORS, rate limiting, and monitoring
2. **Custom Domain**: Set up custom domain with SSL certificate
3. **API Keys**: Implement API key authentication for external consumers
4. **Caching**: Configure API Gateway caching for better performance
5. **Monitoring**: Set up comprehensive monitoring and alerting
6. **VPC Link**: Deploy VPC infrastructure for private service access
7. **HTTP Integrations**: Test HTTP proxy/non-proxy after AWS deployment
