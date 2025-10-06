const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SQSClient, DeleteMessageBatchCommand } = require('@aws-sdk/client-sqs');
const jwt = require('jsonwebtoken');

// Service URLs from environment variables
const USERS_URL = process.env.USERS_URL || 'http://localhost:3001';
const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://localhost:3002';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3003';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';

// AWS clients (lazy, region taken from env/AWS SDK defaults)
const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Allow-Credentials': 'true'
};

// Helper function to create response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...headers },
  body: JSON.stringify(body)
});

// Helper function to determine target service based on path
const getTargetService = (path) => {
  if (path.startsWith('/api/users')) {
    return { url: USERS_URL, path: path.replace('/api/users', '') };
  } else if (path.startsWith('/api/products')) {
    return { url: PRODUCTS_URL, path: path.replace('/api/products', '') };
  } else if (path.startsWith('/api/orders')) {
    return { url: ORDERS_URL, path: path.replace('/api/orders', '') };
  }
  return null;
};

// Main gateway handler
exports.gateway = async (event) => {
  console.log('Gateway event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, headers, body, queryStringParameters } = event;
    
    // Handle CORS preflight requests
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight successful' });
    }

    // Handle health check
    if (path === '/health' || path === '/') {
      return createResponse(200, { 
        ok: true, 
        service: 'aws-api-gateway',
        timestamp: new Date().toISOString(),
        stage: process.env.STAGE || 'dev'
      });
    }

    // Determine target service
    const target = getTargetService(path);
    if (!target) {
      return createResponse(404, { error: 'Service not found' });
    }

    // Prepare request configuration
    const requestConfig = {
      method: httpMethod.toLowerCase(),
      url: `${target.url}${target.path}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AWS-API-Gateway/1.0'
      },
      timeout: 10000
    };

    // Add authorization header if present
    if (headers.Authorization) {
      requestConfig.headers.Authorization = headers.Authorization;
    }

    // Add query parameters
    if (queryStringParameters) {
      requestConfig.params = queryStringParameters;
    }

    // Add request body for POST/PUT/PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
      try {
        requestConfig.data = JSON.parse(body);
      } catch (e) {
        requestConfig.data = body;
      }
    }

    console.log('Proxying request to:', requestConfig.url);
    console.log('Request config:', JSON.stringify(requestConfig, null, 2));

    // Make the request to the target service
    const response = await axios(requestConfig);

    // Return successful response
    return createResponse(response.status, response.data);

  } catch (error) {
    console.error('Gateway error:', error);

    // Handle axios errors
    if (error.response) {
      // Service responded with error status
      return createResponse(error.response.status, {
        error: error.response.data?.error || 'Service error',
        service: 'gateway',
        details: error.response.data
      });
    } else if (error.request) {
      // Service is unreachable
      return createResponse(502, {
        error: 'Service unavailable',
        service: 'gateway',
        details: 'Target service is not responding'
      });
    } else {
      // Other error
      return createResponse(500, {
        error: 'Internal server error',
        service: 'gateway',
        details: error.message
      });
    }
  }
};

// Health check handler
exports.health = async (event) => {
  return createResponse(200, {
    ok: true,
    service: 'aws-api-gateway-health',
    timestamp: new Date().toISOString(),
    stage: process.env.STAGE || 'dev',
    environment: {
      usersUrl: USERS_URL,
      productsUrl: PRODUCTS_URL,
      ordersUrl: ORDERS_URL
    }
  });
};

// Lambda Authorizer (REQUEST type for HTTP API)
exports.authorize = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      isAuthorized: false,
      context: { reason: 'missing_or_malformed_authorization_header' }
    };
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return {
      isAuthorized: true,
      context: {
        sub: decoded.sub || decoded.id || '',
        username: decoded.username || '',
        role: decoded.role || 'user'
      }
    };
  } catch (e) {
    console.log('Authorize error:', e.message);
    return {
      isAuthorized: false,
      context: { reason: 'invalid_token' }
    };
  }
};

// S3 event processor: logs new object keys; writes a small marker file
exports.s3Processor = async (event) => {
  console.log('S3 Event:', JSON.stringify(event, null, 2));
  const records = event.Records || [];
  const processedAt = new Date().toISOString();
  try {
    for (const record of records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      console.log(`New object in S3 → bucket=${bucket} key=${key}`);
      const markerKey = `processed/${key}.processed.json`;
      const body = JSON.stringify({ sourceKey: key, processedAt });
      await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: markerKey, Body: body, ContentType: 'application/json' }));
    }
    return createResponse(200, { ok: true, processed: records.length });
  } catch (err) {
    console.error('s3Processor error:', err);
    return createResponse(500, { ok: false, error: err.message });
  }
};

// SQS consumer: logs messages and deletes them from the queue
exports.sqsConsumer = async (event) => {
  console.log('SQS Event:', JSON.stringify(event, null, 2));
  const records = event.Records || [];
  const entries = [];
  try {
    for (const record of records) {
      console.log('SQS message body:', record.body);
      entries.push({ Id: record.messageId, ReceiptHandle: record.receiptHandle });
    }
    // Delete in batch if using event source mapping, AWS handles deletion automatically; this is defensive
    if (entries.length > 0 && process.env.AWS_SQS_QUEUE_URL) {
      await sqsClient.send(new DeleteMessageBatchCommand({ QueueUrl: process.env.AWS_SQS_QUEUE_URL, Entries: entries }));
    }
    return createResponse(200, { ok: true, consumed: records.length });
  } catch (err) {
    console.error('sqsConsumer error:', err);
    // returning 200 prevents retries; to allow retries, throw error
    return createResponse(500, { ok: false, error: err.message });
  }
};

// Scheduled ping: simple heartbeat and optional warm-up of gateway
exports.scheduledPing = async () => {
  const timestamp = new Date().toISOString();
  console.log(`Scheduled ping at ${timestamp}`);
  try {
    // Optionally warm the health endpoint if running
    if (process.env.WARM_HEALTH_URL) {
      await axios.get(process.env.WARM_HEALTH_URL).catch((e) => console.log('Warm health failed:', e.message));
    }
  } catch (e) {
    console.log('scheduledPing warning:', e.message);
  }
  return createResponse(200, { ok: true, pingAt: timestamp });
};
