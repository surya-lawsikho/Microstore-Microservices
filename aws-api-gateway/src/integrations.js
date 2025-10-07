/**
 * Integration Examples for AWS API Gateway
 * Demonstrates different integration types and patterns
 */

const axios = require('axios');
const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// AWS Clients
const dynamoDBClient = new DynamoDBClient({});
const snsClient = new SNSClient({});
const sqsClient = new SQSClient({});

// Environment variables
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'MicroStore-Products';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || '';
const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://localhost:3002';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

// Helper function to create response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body)
});

/**
 * ========================================
 * LAMBDA NON-PROXY INTEGRATION EXAMPLES
 * ========================================
 * Lambda receives simplified input (transformed by API Gateway)
 * Lambda returns simple data (no statusCode/headers needed)
 */

/**
 * Non-Proxy: Get Product
 * Receives: { operation, resourceId, metadata, user, ... }
 * Returns: Simple product data
 */
exports.nonProxyGetProduct = async (event) => {
  console.log('Non-Proxy Get Product Event:', JSON.stringify(event, null, 2));
  
  try {
    const { resourceId, user } = event;
    
    // Simple business logic - no HTTP formatting needed
    const response = await axios.get(`${PRODUCTS_URL}/${resourceId}`);
    
    // Return simple data - API Gateway will format the response
    return {
      id: response.data.id,
      name: response.data.name,
      price: response.data.price,
      stock: response.data.stock,
      requestedBy: user?.username || 'anonymous'
    };
  } catch (error) {
    // Throw error - API Gateway will handle error response formatting
    throw new Error(`Failed to get product: ${error.message}`);
  }
};

/**
 * Non-Proxy: List Products with Filters
 * Receives: Simplified filter object
 * Returns: Array of products
 */
exports.nonProxyListProducts = async (event) => {
  console.log('Non-Proxy List Products Event:', JSON.stringify(event, null, 2));
  
  try {
    const { queryParameters = {}, user } = event;
    
    // Business logic
    const response = await axios.get(`${PRODUCTS_URL}`, {
      params: queryParameters
    });
    
    // Return simple array - API Gateway adds metadata
    return {
      products: response.data,
      count: response.data.length,
      filters: queryParameters,
      requestedBy: user?.username || 'anonymous'
    };
  } catch (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }
};

/**
 * Non-Proxy: Process Order
 * Receives: Simplified order data
 * Returns: Order result
 */
exports.nonProxyProcessOrder = async (event) => {
  console.log('Non-Proxy Process Order Event:', JSON.stringify(event, null, 2));
  
  try {
    const { body, user, metadata } = event;
    
    // Validate user is authenticated
    if (!user || !user.userId) {
      throw new Error('Authentication required');
    }
    
    // Process order
    const orderData = {
      ...body,
      userId: user.userId,
      processedAt: new Date().toISOString(),
      requestId: metadata.requestId
    };
    
    // In real scenario, you'd process the order
    // For demo, just return confirmation
    return {
      orderId: `ORDER-${Date.now()}`,
      status: 'confirmed',
      total: body.total || 0,
      items: body.items || [],
      userId: user.userId
    };
  } catch (error) {
    throw new Error(`Failed to process order: ${error.message}`);
  }
};

/**
 * ========================================
 * HTTP INTEGRATION EXAMPLES
 * ========================================
 * These are typically configured in serverless.yml
 * No Lambda function needed - API Gateway calls HTTP backend directly
 */

// HTTP Proxy and Non-Proxy are configured in serverless.yml
// They don't need Lambda functions

/**
 * ========================================
 * AWS SERVICE INTEGRATION EXAMPLES
 * ========================================
 * Direct integration with AWS services via API Gateway
 */

/**
 * DynamoDB: Get Item
 * Direct DynamoDB access via API Gateway
 */
exports.dynamoDBGetItem = async (event) => {
  console.log('DynamoDB Get Item Event:', JSON.stringify(event, null, 2));
  
  try {
    const { id } = event.pathParameters || {};
    
    const command = new GetItemCommand({
      TableName: PRODUCTS_TABLE,
      Key: marshall({ id })
    });
    
    const result = await dynamoDBClient.send(command);
    
    if (!result.Item) {
      return createResponse(404, {
        found: false,
        message: 'Product not found'
      });
    }
    
    return createResponse(200, {
      found: true,
      data: unmarshall(result.Item)
    });
  } catch (error) {
    console.error('DynamoDB Get Error:', error);
    return createResponse(500, {
      error: 'Failed to get item',
      message: error.message
    });
  }
};

/**
 * DynamoDB: Put Item
 */
exports.dynamoDBPutItem = async (event) => {
  console.log('DynamoDB Put Item Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    const item = {
      id: body.id || `PROD-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      price: body.price || 0,
      stock: body.stock || 0,
      category: body.category || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const command = new PutItemCommand({
      TableName: PRODUCTS_TABLE,
      Item: marshall(item)
    });
    
    await dynamoDBClient.send(command);
    
    return createResponse(201, {
      success: true,
      message: 'Product created',
      data: item
    });
  } catch (error) {
    console.error('DynamoDB Put Error:', error);
    return createResponse(500, {
      error: 'Failed to create item',
      message: error.message
    });
  }
};

/**
 * DynamoDB: Query Items
 */
exports.dynamoDBQueryItems = async (event) => {
  console.log('DynamoDB Query Items Event:', JSON.stringify(event, null, 2));
  
  try {
    const { category } = event.queryStringParameters || {};
    
    const command = new QueryCommand({
      TableName: PRODUCTS_TABLE,
      IndexName: 'CategoryIndex',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: marshall({
        ':category': category || 'general'
      })
    });
    
    const result = await dynamoDBClient.send(command);
    
    return createResponse(200, {
      items: result.Items?.map(item => unmarshall(item)) || [],
      count: result.Count || 0,
      category: category
    });
  } catch (error) {
    console.error('DynamoDB Query Error:', error);
    return createResponse(500, {
      error: 'Failed to query items',
      message: error.message
    });
  }
};

/**
 * SNS: Publish Message
 * Publish notifications to SNS topic
 */
exports.snsPublish = async (event) => {
  console.log('SNS Publish Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    const message = {
      event: body.event || 'notification',
      data: body.data || {},
      metadata: {
        source: 'api-gateway',
        requestId: event.requestContext?.requestId,
        timestamp: new Date().toISOString()
      }
    };
    
    const command = new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Message: JSON.stringify(message),
      Subject: body.subject || 'MicroStore Notification',
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: body.event || 'notification'
        },
        priority: {
          DataType: 'String',
          StringValue: body.priority || 'normal'
        }
      }
    });
    
    const result = await snsClient.send(command);
    
    return createResponse(200, {
      success: true,
      message: 'Notification published',
      messageId: result.MessageId
    });
  } catch (error) {
    console.error('SNS Publish Error:', error);
    return createResponse(500, {
      error: 'Failed to publish notification',
      message: error.message
    });
  }
};

/**
 * SQS: Send Message
 * Send message to SQS queue
 */
exports.sqsSendMessage = async (event) => {
  console.log('SQS Send Message Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    const message = {
      type: body.type || 'event',
      payload: body.payload || {},
      metadata: {
        source: 'api-gateway',
        requestId: event.requestContext?.requestId,
        timestamp: new Date().toISOString()
      }
    };
    
    const command = new SendMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        EventType: {
          DataType: 'String',
          StringValue: body.type || 'event'
        },
        RequestId: {
          DataType: 'String',
          StringValue: event.requestContext?.requestId || 'unknown'
        }
      },
      DelaySeconds: body.delaySeconds || 0
    });
    
    const result = await sqsClient.send(command);
    
    return createResponse(200, {
      success: true,
      message: 'Message sent to queue',
      messageId: result.MessageId
    });
  } catch (error) {
    console.error('SQS Send Message Error:', error);
    return createResponse(500, {
      error: 'Failed to send message',
      message: error.message
    });
  }
};

/**
 * ========================================
 * MOCK INTEGRATION EXAMPLES
 * ========================================
 * Mock responses for testing/demo
 */

/**
 * Mock: Health Check
 * Returns mock health status
 */
exports.mockHealth = async (event) => {
  return createResponse(200, {
    status: 'healthy',
    service: 'mock-integration',
    timestamp: new Date().toISOString(),
    mock: true,
    message: 'This is a mock response from API Gateway'
  });
};

/**
 * Mock: Products List
 * Returns mock product data
 */
exports.mockProducts = async (event) => {
  const mockProducts = [
    {
      id: '1',
      name: 'Mock Laptop',
      price: 999.99,
      stock: 50,
      category: 'electronics',
      mock: true
    },
    {
      id: '2',
      name: 'Mock Phone',
      price: 499.99,
      stock: 100,
      category: 'electronics',
      mock: true
    },
    {
      id: '3',
      name: 'Mock Headphones',
      price: 99.99,
      stock: 200,
      category: 'accessories',
      mock: true
    }
  ];
  
  return createResponse(200, {
    products: mockProducts,
    count: mockProducts.length,
    mock: true,
    message: 'This is mock data from API Gateway'
  });
};

/**
 * ========================================
 * TRANSFORMATION EXAMPLES
 * ========================================
 * Examples of complex transformations
 */

/**
 * Transform: Request Enrichment
 * Enriches request with additional context
 */
exports.transformEnrichRequest = async (event) => {
  console.log('Transform Enrich Request Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Enrich request with additional data
    const enrichedRequest = {
      original: body,
      enrichment: {
        requestId: event.requestContext?.requestId,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.requestContext?.identity?.userAgent,
        timestamp: new Date().toISOString(),
        region: process.env.AWS_REGION,
        stage: event.requestContext?.stage
      },
      authentication: {
        userId: event.requestContext?.authorizer?.sub || null,
        username: event.requestContext?.authorizer?.username || null,
        role: event.requestContext?.authorizer?.role || 'guest'
      }
    };
    
    return createResponse(200, enrichedRequest);
  } catch (error) {
    return createResponse(500, {
      error: 'Transformation failed',
      message: error.message
    });
  }
};

/**
 * Transform: Response Pagination
 * Adds pagination metadata to response
 */
exports.transformPagination = async (event) => {
  console.log('Transform Pagination Event:', JSON.stringify(event, null, 2));
  
  try {
    const { page = 1, limit = 10 } = event.queryStringParameters || {};
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Fetch data from backend
    const response = await axios.get(`${PRODUCTS_URL}`, {
      params: { page: pageNum, limit: limitNum }
    });
    
    const total = response.data.length; // In real app, this comes from backend
    const hasMore = pageNum * limitNum < total;
    
    return createResponse(200, {
      items: response.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        hasMore: hasMore,
        totalPages: Math.ceil(total / limitNum)
      },
      links: {
        self: `${event.requestContext?.domainName}${event.requestContext?.path}?page=${pageNum}&limit=${limitNum}`,
        next: hasMore ? `${event.requestContext?.domainName}${event.requestContext?.path}?page=${pageNum + 1}&limit=${limitNum}` : null,
        prev: pageNum > 1 ? `${event.requestContext?.domainName}${event.requestContext?.path}?page=${pageNum - 1}&limit=${limitNum}` : null
      }
    });
  } catch (error) {
    return createResponse(500, {
      error: 'Pagination failed',
      message: error.message
    });
  }
};

/**
 * ========================================
 * VPC LINK INTEGRATION EXAMPLES
 * ========================================
 * These are typically configured in serverless.yml
 * with VPC Link connectionId
 */

/**
 * VPC Link: Private Service Call
 * Demonstrates calling a private VPC service
 */
exports.vpcLinkHandler = async (event) => {
  console.log('VPC Link Handler Event:', JSON.stringify(event, null, 2));
  
  // In real scenario, this Lambda would be in the same VPC
  // or API Gateway would use VPC Link to call private resources
  
  try {
    // Call internal service (must be accessible from Lambda's VPC)
    const internalServiceUrl = process.env.INTERNAL_SERVICE_URL || 'http://internal-service:3000';
    
    const response = await axios.get(`${internalServiceUrl}/health`);
    
    return createResponse(200, {
      success: true,
      source: 'vpc-private-service',
      data: response.data,
      message: 'Called private VPC service successfully'
    });
  } catch (error) {
    console.error('VPC Link Error:', error);
    return createResponse(500, {
      error: 'Failed to call private service',
      message: error.message
    });
  }
};

module.exports = exports;

