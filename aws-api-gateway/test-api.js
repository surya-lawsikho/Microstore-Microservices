#!/usr/bin/env node

/**
 * Test script for AWS API Gateway POC
 * This script tests all the API endpoints to ensure they work correctly
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER = {
  username: `testuser_${Date.now()}`,
  password: 'TestPass123!'
};

let accessToken = '';
let refreshToken = '';
let testProductId = '';
let testOrderId = '';

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

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  const result = await apiCall('GET', '/health');
  if (result.success) {
    console.log('✅ Health check passed:', result.data);
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  return result.success;
}

async function testUserRegistration() {
  console.log('🔍 Testing user registration...');
  const result = await apiCall('POST', '/api/users/register', TEST_USER);
  if (result.success) {
    console.log('✅ User registration passed:', result.data);
  } else {
    console.log('❌ User registration failed:', result.error);
  }
  return result.success;
}

async function testUserLogin() {
  console.log('🔍 Testing user login...');
  const result = await apiCall('POST', '/api/users/login', TEST_USER);
  if (result.success) {
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    console.log('✅ User login passed:', { 
      user: result.data.user.username,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });
  } else {
    console.log('❌ User login failed:', result.error);
  }
  return result.success;
}

async function testGetCurrentUser() {
  console.log('🔍 Testing get current user...');
  const result = await apiCall('GET', '/api/users/me', null, {
    Authorization: `Bearer ${accessToken}`
  });
  if (result.success) {
    console.log('✅ Get current user passed:', result.data);
  } else {
    console.log('❌ Get current user failed:', result.error);
  }
  return result.success;
}

async function testGetProducts() {
  console.log('🔍 Testing get products...');
  const result = await apiCall('GET', '/api/products');
  if (result.success) {
    console.log('✅ Get products passed:', `${result.data.length} products found`);
    if (result.data.length > 0) {
      testProductId = result.data[0].id;
    }
  } else {
    console.log('❌ Get products failed:', result.error);
  }
  return result.success;
}

async function testGetProductById() {
  if (!testProductId) {
    console.log('⚠️  Skipping get product by ID - no product ID available');
    return true;
  }
  
  console.log('🔍 Testing get product by ID...');
  const result = await apiCall('GET', `/api/products/${testProductId}`);
  if (result.success) {
    console.log('✅ Get product by ID passed:', result.data);
  } else {
    console.log('❌ Get product by ID failed:', result.error);
  }
  return result.success;
}

async function testCreateOrder() {
  if (!testProductId) {
    console.log('⚠️  Skipping create order - no product ID available');
    return true;
  }
  
  console.log('🔍 Testing create order...');
  const orderData = {
    items: [
      { productId: testProductId, qty: 2 }
    ]
  };
  
  const result = await apiCall('POST', '/api/orders', orderData, {
    Authorization: `Bearer ${accessToken}`
  });
  if (result.success) {
    testOrderId = result.data.id;
    console.log('✅ Create order passed:', { 
      orderId: result.data.id,
      total: result.data.total
    });
  } else {
    console.log('❌ Create order failed:', result.error);
  }
  return result.success;
}

async function testGetUserOrders() {
  console.log('🔍 Testing get user orders...');
  const result = await apiCall('GET', '/api/orders', null, {
    Authorization: `Bearer ${accessToken}`
  });
  if (result.success) {
    console.log('✅ Get user orders passed:', `${result.data.length} orders found`);
  } else {
    console.log('❌ Get user orders failed:', result.error);
  }
  return result.success;
}

async function testRefreshToken() {
  console.log('🔍 Testing refresh token...');
  const result = await apiCall('POST', '/api/users/refresh-token', {
    refreshToken
  });
  if (result.success) {
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    console.log('✅ Refresh token passed:', {
      hasNewAccessToken: !!accessToken,
      hasNewRefreshToken: !!refreshToken
    });
  } else {
    console.log('❌ Refresh token failed:', result.error);
  }
  return result.success;
}

async function testLogout() {
  console.log('🔍 Testing logout...');
  const result = await apiCall('POST', '/api/users/logout', null, {
    Authorization: `Bearer ${accessToken}`
  });
  if (result.success) {
    console.log('✅ Logout passed:', result.data);
  } else {
    console.log('❌ Logout failed:', result.error);
  }
  return result.success;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Gateway POC Tests');
  console.log(`🌐 Testing API at: ${API_BASE_URL}`);
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Get Products', fn: testGetProducts },
    { name: 'Get Product by ID', fn: testGetProductById },
    { name: 'Create Order', fn: testCreateOrder },
    { name: 'Get User Orders', fn: testGetUserOrders },
    { name: 'Refresh Token', fn: testRefreshToken },
    { name: 'Logout', fn: testLogout }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log('-'.repeat(30));
  }
  
  console.log('=' .repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Your AWS API Gateway POC is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check your microservices and API Gateway configuration.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
