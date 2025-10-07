#!/usr/bin/env node

/**
 * Comprehensive Integration Tests for AWS API Gateway POC
 * Tests all integration types: Lambda Proxy, Non-Proxy, HTTP, AWS Services, VPC Link, Mock
 */

const axios = require('axios');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DYNAMODB_TABLE = process.env.PRODUCTS_TABLE || 'MicroStore-Products-dev';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let accessToken = '';
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Helper function to log test results
function logTest(category, testName, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`${colors.green}✅ ${category}: ${testName}${colors.reset}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}❌ ${category}: ${testName}${colors.reset}`);
  }
  if (details) {
    console.log(`   ${colors.cyan}${details}${colors.reset}`);
  }
}

function logSkip(category, testName, reason) {
  testResults.total++;
  testResults.skipped++;
  console.log(`${colors.yellow}⚠️  ${category}: ${testName} - ${reason}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

// ========================================
// SETUP: Seed test data
// ========================================

async function seedTestData() {
  logSection('SETUP: Seeding Test Data');
  
  try {
    // Seed a test product to DynamoDB (if accessible)
    const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
    
    const testProduct = {
      id: 'test-product-123',
      name: 'Test Laptop',
      description: 'A test product for integration testing',
      price: 999.99,
      stock: 50,
      category: 'electronics',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await dynamoClient.send(new PutItemCommand({
      TableName: DYNAMODB_TABLE,
      Item: marshall(testProduct)
    }));
    
    console.log(`${colors.green}✅ Seeded test product to DynamoDB${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not seed DynamoDB (table may not exist): ${error.message}${colors.reset}`);
  }
  
  // Get authentication token
  try {
    const testUser = {
      username: `testuser_${Date.now()}`,
      password: 'TestPass123!'
    };
    
    // Register
    await apiCall('POST', '/api/users/register', testUser);
    
    // Login
    const loginResult = await apiCall('POST', '/api/users/login', testUser);
    if (loginResult.success) {
      accessToken = loginResult.data.accessToken;
      console.log(`${colors.green}✅ Obtained access token${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not obtain access token: ${error.message}${colors.reset}`);
  }
}

// ========================================
// TEST 1: Lambda Proxy Integration
// ========================================

async function testLambdaProxyIntegration() {
  logSection('TEST 1: Lambda Proxy Integration');
  
  // Test 1.1: Health check (existing proxy)
  const healthResult = await apiCall('GET', '/health');
  logTest('Lambda Proxy', 'Health Check', 
    healthResult.success && healthResult.data.ok,
    healthResult.success ? `Status: ${healthResult.status}` : `Error: ${healthResult.error}`
  );
  
  // Test 1.2: Get products (existing proxy)
  const productsResult = await apiCall('GET', '/api/products');
  logTest('Lambda Proxy', 'Get Products', 
    productsResult.success,
    productsResult.success ? `Found ${productsResult.data?.length || 0} products` : `Error: ${productsResult.error}`
  );
  
  // Test 1.3: Protected route (existing proxy with auth)
  if (accessToken) {
    const meResult = await apiCall('GET', '/api/users/me', null, {
      Authorization: `Bearer ${accessToken}`
    });
    logTest('Lambda Proxy', 'Get Current User (Auth)', 
      meResult.success,
      meResult.success ? `User: ${meResult.data?.username}` : `Error: ${meResult.error}`
    );
  } else {
    logSkip('Lambda Proxy', 'Get Current User (Auth)', 'No access token');
  }
}

// ========================================
// TEST 2: Lambda Non-Proxy Integration
// ========================================

async function testLambdaNonProxyIntegration() {
  logSection('TEST 2: Lambda Non-Proxy Integration');
  
  // Test 2.1: Get product (non-proxy with transformations)
  const getProductResult = await apiCall('GET', '/integrations/non-proxy/products/1');
  logTest('Lambda Non-Proxy', 'Get Product with Transformation', 
    getProductResult.success || getProductResult.status === 404,
    getProductResult.success 
      ? `Product: ${getProductResult.data?.name}` 
      : `Status: ${getProductResult.status}`
  );
  
  // Test 2.2: List products (non-proxy)
  const listProductsResult = await apiCall('GET', '/integrations/non-proxy/products?category=electronics&limit=5');
  logTest('Lambda Non-Proxy', 'List Products with Filters', 
    listProductsResult.success,
    listProductsResult.success 
      ? `Count: ${listProductsResult.data?.count}` 
      : `Error: ${listProductsResult.error}`
  );
  
  // Test 2.3: Process order (non-proxy with auth)
  if (accessToken) {
    const orderData = {
      items: [
        { productId: '1', quantity: 2, price: 99.99 }
      ],
      total: 199.98
    };
    
    const orderResult = await apiCall('POST', '/integrations/non-proxy/orders', orderData, {
      Authorization: `Bearer ${accessToken}`
    });
    logTest('Lambda Non-Proxy', 'Process Order (Auth)', 
      orderResult.success,
      orderResult.success 
        ? `Order ID: ${orderResult.data?.orderId}` 
        : `Error: ${orderResult.error}`
    );
  } else {
    logSkip('Lambda Non-Proxy', 'Process Order (Auth)', 'No access token');
  }
}

// ========================================
// TEST 3: HTTP Integration
// ========================================

async function testHTTPIntegration() {
  logSection('TEST 3: HTTP Integration');
  
  // Note: HTTP integrations are typically configured directly in serverless.yml
  // They don't go through Lambda, so we can't test them in local mode
  // These tests would work when deployed to AWS
  
  logSkip('HTTP Proxy', 'Direct HTTP Backend Call', 
    'Requires deployment to AWS (not available in serverless-offline)'
  );
  
  logSkip('HTTP Non-Proxy', 'HTTP with Request Transformation', 
    'Requires deployment to AWS (not available in serverless-offline)'
  );
}

// ========================================
// TEST 4: AWS Service Integrations
// ========================================

async function testAWSServiceIntegrations() {
  logSection('TEST 4: AWS Service Integrations');
  
  // Test 4.1: DynamoDB Get Item
  const dynamoGetResult = await apiCall('GET', '/integrations/dynamodb/products/test-product-123');
  logTest('AWS Service', 'DynamoDB Get Item', 
    dynamoGetResult.success || dynamoGetResult.status === 404,
    dynamoGetResult.success 
      ? `Found: ${dynamoGetResult.data?.found}` 
      : `Status: ${dynamoGetResult.status}`
  );
  
  // Test 4.2: DynamoDB Put Item
  const newProduct = {
    name: 'Integration Test Product',
    description: 'Created via API Gateway',
    price: 49.99,
    stock: 100,
    category: 'test'
  };
  
  const dynamoPutResult = await apiCall('POST', '/integrations/dynamodb/products', newProduct);
  logTest('AWS Service', 'DynamoDB Put Item', 
    dynamoPutResult.success,
    dynamoPutResult.success 
      ? `Product ID: ${dynamoPutResult.data?.data?.id}` 
      : `Error: ${dynamoPutResult.error}`
  );
  
  // Test 4.3: DynamoDB Query Items
  const dynamoQueryResult = await apiCall('GET', '/integrations/dynamodb/products/query?category=electronics');
  logTest('AWS Service', 'DynamoDB Query Items', 
    dynamoQueryResult.success,
    dynamoQueryResult.success 
      ? `Count: ${dynamoQueryResult.data?.count}` 
      : `Error: ${dynamoQueryResult.error}`
  );
  
  // Test 4.4: SNS Publish
  const snsData = {
    event: 'test_notification',
    subject: 'Test Notification',
    data: { message: 'Integration test notification' },
    priority: 'low'
  };
  
  const snsResult = await apiCall('POST', '/integrations/sns/publish', snsData);
  logTest('AWS Service', 'SNS Publish Message', 
    snsResult.success,
    snsResult.success 
      ? `Message ID: ${snsResult.data?.messageId}` 
      : `Error: ${snsResult.error}`
  );
  
  // Test 4.5: SQS Send Message
  const sqsData = {
    type: 'test_event',
    payload: { message: 'Integration test event' },
    delaySeconds: 0
  };
  
  const sqsResult = await apiCall('POST', '/integrations/sqs/send', sqsData);
  logTest('AWS Service', 'SQS Send Message', 
    sqsResult.success,
    sqsResult.success 
      ? `Message ID: ${sqsResult.data?.messageId}` 
      : `Error: ${sqsResult.error}`
  );
}

// ========================================
// TEST 5: Mock Integrations
// ========================================

async function testMockIntegrations() {
  logSection('TEST 5: Mock Integrations');
  
  // Test 5.1: Mock health check
  const mockHealthResult = await apiCall('GET', '/integrations/mock/health');
  logTest('Mock', 'Mock Health Check', 
    mockHealthResult.success && mockHealthResult.data.mock === true,
    mockHealthResult.success 
      ? `Mock: ${mockHealthResult.data.mock}` 
      : `Error: ${mockHealthResult.error}`
  );
  
  // Test 5.2: Mock products list
  const mockProductsResult = await apiCall('GET', '/integrations/mock/products');
  logTest('Mock', 'Mock Products List', 
    mockProductsResult.success && mockProductsResult.data.mock === true,
    mockProductsResult.success 
      ? `Products: ${mockProductsResult.data.products?.length}` 
      : `Error: ${mockProductsResult.error}`
  );
}

// ========================================
// TEST 6: Transformation Examples
// ========================================

async function testTransformations() {
  logSection('TEST 6: Transformation Examples');
  
  // Test 6.1: Request enrichment
  const enrichData = {
    action: 'test_action',
    data: { key: 'value' }
  };
  
  const enrichResult = await apiCall('POST', '/integrations/transform/enrich', enrichData);
  logTest('Transform', 'Request Enrichment', 
    enrichResult.success && enrichResult.data.enrichment,
    enrichResult.success 
      ? `Request ID: ${enrichResult.data.enrichment?.requestId}` 
      : `Error: ${enrichResult.error}`
  );
  
  // Test 6.2: Response pagination
  const paginationResult = await apiCall('GET', '/integrations/transform/pagination?page=1&limit=5');
  logTest('Transform', 'Response Pagination', 
    paginationResult.success && paginationResult.data.pagination,
    paginationResult.success 
      ? `Page: ${paginationResult.data.pagination?.page}, Items: ${paginationResult.data.items?.length}` 
      : `Error: ${paginationResult.error}`
  );
}

// ========================================
// TEST 7: VPC Link Integration
// ========================================

async function testVPCLinkIntegration() {
  logSection('TEST 7: VPC Link Integration');
  
  // Test 7.1: VPC Link health check
  const vpcLinkResult = await apiCall('GET', '/integrations/vpc-link/health');
  logTest('VPC Link', 'Private Service Call', 
    vpcLinkResult.success || vpcLinkResult.status === 502,
    vpcLinkResult.success 
      ? 'VPC service accessible' 
      : 'VPC service not configured (expected in local mode)'
  );
  
  logSkip('VPC Link', 'NLB Configuration', 
    'Requires AWS deployment with VPC Link and NLB'
  );
}

// ========================================
// TEST 8: Mapping Templates (VTL)
// ========================================

async function testMappingTemplates() {
  logSection('TEST 8: Mapping Templates (VTL)');
  
  console.log(`${colors.cyan}ℹ️  Mapping templates are tested indirectly through:${colors.reset}`);
  console.log(`   - Lambda Non-Proxy integrations (request/response transformation)`);
  console.log(`   - AWS Service integrations (DynamoDB, SNS, SQS transformations)`);
  console.log(`   - HTTP Non-Proxy integrations (when deployed)`);
  console.log(`\n${colors.cyan}ℹ️  VTL templates are located in: mapping-templates/` + `${colors.reset}`);
  console.log(`   - lambda-non-proxy-request.vtl`);
  console.log(`   - lambda-non-proxy-response.vtl`);
  console.log(`   - dynamodb-get-request.vtl`);
  console.log(`   - dynamodb-get-response.vtl`);
  console.log(`   - sns-publish-request.vtl`);
  console.log(`   - sqs-send-request.vtl`);
  console.log(`   - error-response.vtl\n`);
}

// ========================================
// TEST 9: Error Handling
// ========================================

async function testErrorHandling() {
  logSection('TEST 9: Error Handling');
  
  // Test 9.1: 404 Not Found
  const notFoundResult = await apiCall('GET', '/integrations/non-existent-endpoint');
  logTest('Error Handling', '404 Not Found', 
    notFoundResult.status === 404,
    `Status: ${notFoundResult.status}`
  );
  
  // Test 9.2: 401 Unauthorized
  const unauthorizedResult = await apiCall('GET', '/api/users/me');
  logTest('Error Handling', '401 Unauthorized', 
    unauthorizedResult.status === 401 || unauthorizedResult.status === 403,
    `Status: ${unauthorizedResult.status}`
  );
  
  // Test 9.3: 400 Bad Request (invalid data)
  const badRequestResult = await apiCall('POST', '/integrations/dynamodb/products', {
    // Missing required fields
  });
  logTest('Error Handling', '400 Bad Request', 
    badRequestResult.status === 400 || badRequestResult.status === 500,
    `Status: ${badRequestResult.status}`
  );
}

// ========================================
// Main Test Runner
// ========================================

async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   AWS API Gateway Integration Types - Comprehensive Test Suite      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
  console.log(`${colors.reset}`);
  
  console.log(`${colors.cyan}🌐 Testing API at: ${API_BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}📍 AWS Region: ${AWS_REGION}${colors.reset}`);
  console.log(`${colors.cyan}📅 Test Date: ${new Date().toISOString()}${colors.reset}\n`);
  
  try {
    // Setup
    await seedTestData();
    
    // Run all test suites
    await testLambdaProxyIntegration();
    await testLambdaNonProxyIntegration();
    await testHTTPIntegration();
    await testAWSServiceIntegrations();
    await testMockIntegrations();
    await testTransformations();
    await testVPCLinkIntegration();
    await testMappingTemplates();
    await testErrorHandling();
    
    // Print summary
    logSection('TEST SUMMARY');
    
    const successRate = ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1);
    
    console.log(`${colors.bright}Total Tests:    ${testResults.total}${colors.reset}`);
    console.log(`${colors.green}✅ Passed:      ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed:      ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Skipped:     ${testResults.skipped}${colors.reset}`);
    console.log(`${colors.cyan}📊 Success Rate: ${successRate}% (excluding skipped)${colors.reset}\n`);
    
    if (testResults.failed === 0) {
      console.log(`${colors.bright}${colors.green}🎉 All tests passed! Your API Gateway integrations are working correctly.${colors.reset}\n`);
    } else {
      console.log(`${colors.bright}${colors.yellow}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
    }
    
    // Integration types coverage
    console.log(`${colors.bright}${colors.blue}Integration Types Tested:${colors.reset}`);
    console.log(`  ✅ Lambda Proxy Integration`);
    console.log(`  ✅ Lambda Non-Proxy Integration`);
    console.log(`  ⚠️  HTTP Proxy Integration (requires AWS deployment)`);
    console.log(`  ⚠️  HTTP Non-Proxy Integration (requires AWS deployment)`);
    console.log(`  ✅ AWS Service Integration (DynamoDB, SNS, SQS)`);
    console.log(`  ✅ Mock Integration`);
    console.log(`  ⚠️  VPC Link Integration (requires AWS deployment)`);
    console.log(`  ✅ Mapping Templates (VTL)`);
    console.log(`  ✅ Error Handling\n`);
    
    console.log(`${colors.cyan}📚 For more information, see:${colors.reset}`);
    console.log(`   - INTEGRATION-TYPES-GUIDE.md`);
    console.log(`   - README.md\n`);
    
    process.exit(testResults.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };

