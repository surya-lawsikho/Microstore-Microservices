const axios = require('axios');

// Service URLs from environment variables
const USERS_URL = process.env.USERS_URL || 'http://localhost:3001';
const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://localhost:3002';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3003';

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
