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

## Next Steps

1. **Production Deployment**: Configure proper CORS, rate limiting, and monitoring
2. **Custom Domain**: Set up custom domain with SSL certificate
3. **API Keys**: Implement API key authentication for external consumers
4. **Caching**: Configure API Gateway caching for better performance
5. **Monitoring**: Set up comprehensive monitoring and alerting
