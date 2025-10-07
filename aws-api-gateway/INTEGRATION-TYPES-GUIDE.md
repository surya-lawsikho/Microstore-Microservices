# AWS API Gateway Integration Types - Complete Guide

## Overview

This guide explores all AWS API Gateway integration types, their architectures, use cases, and practical implementations in the MicroStore project.

## Table of Contents

1. [Integration Types Overview](#integration-types-overview)
2. [Lambda Proxy Integration](#1-lambda-proxy-integration)
3. [Lambda Non-Proxy Integration](#2-lambda-non-proxy-integration)
4. [HTTP Proxy Integration](#3-http-proxy-integration)
5. [HTTP Non-Proxy Integration](#4-http-non-proxy-integration)
6. [AWS Service Integration](#5-aws-service-integration)
7. [VPC Link Integration](#6-vpc-link-integration)
8. [Mock Integration](#7-mock-integration)
9. [Mapping Templates with VTL](#mapping-templates-with-vtl)
10. [Comparison Table](#comparison-table)
11. [When to Use Each Integration Type](#when-to-use-each-integration-type)

---

## Integration Types Overview

API Gateway supports 6 main integration types:

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Integration Types                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Lambda Proxy      →  Lambda (pass-through)                  │
│  2. Lambda Non-Proxy  →  Lambda (with transformations)          │
│  3. HTTP Proxy        →  HTTP Backend (pass-through)            │
│  4. HTTP Non-Proxy    →  HTTP Backend (with transformations)    │
│  5. AWS Service       →  Direct AWS Service (DynamoDB, SNS, etc)│
│  6. Mock              →  Returns mock responses                  │
│  7. VPC Link          →  Private VPC resources                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Lambda Proxy Integration

### Architecture
```
┌────────┐         ┌─────────────┐         ┌────────┐
│ Client │ ──────> │ API Gateway │ ──────> │ Lambda │
└────────┘         └─────────────┘         └────────┘
                     (Pass-through)           (Handle everything)
```

### Characteristics
- **Type**: `AWS_PROXY` or `aws_proxy`
- **Request transformation**: None (API Gateway passes entire request)
- **Response transformation**: None (Lambda must return correct format)
- **Lambda receives**: Full event with all HTTP context
- **Lambda must return**: Specific format with statusCode, headers, body

### Request Format Lambda Receives
```json
{
  "httpMethod": "GET",
  "path": "/api/products",
  "headers": {
    "Authorization": "Bearer token...",
    "Content-Type": "application/json"
  },
  "queryStringParameters": { "category": "electronics" },
  "body": "{...}",
  "isBase64Encoded": false,
  "requestContext": { /* full request context */ }
}
```

### Response Format Lambda Must Return
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"message\":\"Success\"}"
}
```

### Pros
✅ Simple to implement  
✅ Full control in Lambda  
✅ Access to all request details  
✅ Most flexible  

### Cons
❌ Lambda must handle response formatting  
❌ More code in Lambda  
❌ Cannot transform request/response at API Gateway level  

### Use Cases
- Microservices gateway (like our current MicroStore implementation)
- Dynamic routing
- Complex business logic
- When you need full request context

### Example in MicroStore
```javascript
// Current implementation in src/handler.js
exports.gateway = async (event) => {
  const { httpMethod, path, headers, body } = event;
  
  // Full control over routing and response
  const target = getTargetService(path);
  const response = await axios(/* ... */);
  
  return {
    statusCode: response.status,
    headers: { /* CORS headers */ },
    body: JSON.stringify(response.data)
  };
};
```

---

## 2. Lambda Non-Proxy Integration

### Architecture
```
┌────────┐    ┌─────────────────┐    ┌────────┐
│ Client │ ─> │  API Gateway    │ ─> │ Lambda │
└────────┘    │  - Transform    │    └────────┘
              │    Request      │
              │  - Transform    │
              │    Response     │
              └─────────────────┘
```

### Characteristics
- **Type**: `AWS` or `aws`
- **Request transformation**: Via Mapping Templates (VTL)
- **Response transformation**: Via Mapping Templates (VTL)
- **Lambda receives**: Transformed/simplified input
- **Lambda returns**: Simple data (no statusCode/headers needed)

### Request Transformation Example
```velocity
## Transform query params to Lambda input
{
  "operation": "$input.params('operation')",
  "productId": "$input.params('id')",
  "data": $input.json('$')
}
```

### Lambda Receives (Simplified)
```json
{
  "operation": "getProduct",
  "productId": "123",
  "data": { "includeReviews": true }
}
```

### Lambda Returns (Simple)
```json
{
  "id": "123",
  "name": "Laptop",
  "price": 999.99
}
```

### Response Transformation Example
```velocity
## Add custom wrapper and metadata
{
  "success": true,
  "timestamp": "$context.requestTime",
  "data": $input.json('$'),
  "requestId": "$context.requestId"
}
```

### Pros
✅ Lambda code is simpler (no HTTP formatting)  
✅ Transform requests at API Gateway level  
✅ Reusable Lambda functions  
✅ Better separation of concerns  

### Cons
❌ More complex configuration  
❌ Need to learn VTL (Velocity Template Language)  
❌ Harder to debug  
❌ Less flexible than proxy  

### Use Cases
- Simple CRUD operations
- Transform legacy Lambda functions
- Standardize request/response formats
- Reduce Lambda complexity

---

## 3. HTTP Proxy Integration

### Architecture
```
┌────────┐         ┌─────────────┐         ┌─────────────┐
│ Client │ ──────> │ API Gateway │ ──────> │ HTTP Backend│
└────────┘         └─────────────┘         └─────────────┘
                    (Pass-through)          (Any HTTP endpoint)
```

### Characteristics
- **Type**: `HTTP_PROXY` or `http_proxy`
- **Request transformation**: None (pass-through)
- **Response transformation**: None (pass-through)
- **Direct connection**: To HTTP endpoints (no Lambda needed)
- **Cost**: Lower (no Lambda invocation cost)

### Configuration Example
```yaml
# serverless.yml
functions:
  httpProxy:
    handler: not_needed_for_http_proxy
    events:
      - httpApi:
          path: /products-direct
          method: get
          integration:
            type: http_proxy
            uri: http://localhost:3002/products
```

### Pros
✅ No Lambda needed  
✅ Lower cost  
✅ Lower latency  
✅ Simple pass-through  

### Cons
❌ No request/response transformation  
❌ Backend must handle CORS  
❌ No business logic at gateway  
❌ Limited error handling  

### Use Cases
- Public APIs that don't need transformation
- Microservices with proper HTTP responses
- Cost-sensitive applications
- Low-latency requirements

---

## 4. HTTP Non-Proxy Integration

### Architecture
```
┌────────┐    ┌─────────────────┐    ┌─────────────┐
│ Client │ ─> │  API Gateway    │ ─> │ HTTP Backend│
└────────┘    │  - Transform    │    └─────────────┘
              │    Request      │
              │  - Transform    │
              │    Response     │
              └─────────────────┘
```

### Characteristics
- **Type**: `HTTP` or `http`
- **Request transformation**: Via Mapping Templates
- **Response transformation**: Via Mapping Templates
- **Direct connection**: To HTTP endpoints
- **Transform at gateway**: Modify before/after backend call

### Request Mapping Template Example
```velocity
## Transform API Gateway format to backend format
#set($inputRoot = $input.path('$'))
{
  "product_id": "$input.params('id')",
  "customer_data": {
    "user_id": "$context.authorizer.sub",
    "timestamp": "$context.requestTime"
  },
  "request_payload": $input.json('$')
}
```

### Response Mapping Template Example
```velocity
## Standardize backend response
#set($inputRoot = $input.path('$'))
{
  "status": "success",
  "apiVersion": "v1",
  "data": $inputRoot,
  "metadata": {
    "requestId": "$context.requestId",
    "responseTime": "$context.responseTime"
  }
}
```

### Pros
✅ Transform at API Gateway (no Lambda)  
✅ Lower cost than Lambda  
✅ Standardize responses  
✅ Backend doesn't need API Gateway format  

### Cons
❌ Complex VTL templates  
❌ Limited transformation logic  
❌ Harder to debug  
❌ Less flexible than Lambda  

### Use Cases
- Legacy backends needing format conversion
- Standardize multiple backend responses
- Add metadata without Lambda
- Cost optimization

---

## 5. AWS Service Integration

### Architecture
```
┌────────┐         ┌─────────────┐         ┌──────────────┐
│ Client │ ──────> │ API Gateway │ ──────> │ AWS Service  │
└────────┘         └─────────────┘         │ (DynamoDB,   │
                     (Direct call)          │  SNS, SQS,   │
                                            │  Step Func.) │
                                            └──────────────┘
```

### Characteristics
- **Type**: `AWS` with specific service
- **No Lambda needed**: Direct integration
- **Transform required**: Map to AWS service format
- **Use cases**: CRUD operations, messaging, workflows

### Example: DynamoDB Integration

#### Configuration
```yaml
functions:
  dynamodbIntegration:
    handler: not_needed
    events:
      - httpApi:
          path: /items/{id}
          method: get
          integration:
            type: aws
            credentials: ${self:custom.apiGatewayRole}
            uri: arn:aws:apigateway:${aws:region}:dynamodb:action/GetItem
            requestTemplates:
              application/json: ${file(mapping-templates/dynamodb-get-request.vtl)}
            integrationResponses:
              - statusCode: 200
                responseTemplates:
                  application/json: ${file(mapping-templates/dynamodb-get-response.vtl)}
```

#### Request Mapping (dynamodb-get-request.vtl)
```velocity
{
  "TableName": "Products",
  "Key": {
    "id": {
      "S": "$input.params('id')"
    }
  }
}
```

#### Response Mapping (dynamodb-get-response.vtl)
```velocity
#set($inputRoot = $input.path('$'))
{
  "id": "$inputRoot.Item.id.S",
  "name": "$inputRoot.Item.name.S",
  "price": $inputRoot.Item.price.N
}
```

### Example: SNS Integration

#### Configuration
```yaml
functions:
  snsIntegration:
    handler: not_needed
    events:
      - httpApi:
          path: /notify
          method: post
          integration:
            type: aws
            credentials: ${self:custom.apiGatewayRole}
            uri: arn:aws:apigateway:${aws:region}:sns:action/Publish
```

#### Request Mapping
```velocity
{
  "TopicArn": "arn:aws:sns:${aws:region}:${aws:accountId}:notifications",
  "Message": "$util.escapeJavaScript($input.json('$.message'))",
  "Subject": "$input.path('$.subject')"
}
```

### Pros
✅ No Lambda cost  
✅ Direct service integration  
✅ Lower latency  
✅ Serverless architecture  

### Cons
❌ Complex VTL templates  
❌ Limited to AWS services  
❌ Harder to debug  
❌ IAM roles required  

### Use Cases
- Simple CRUD with DynamoDB
- Event publishing to SNS/SQS
- Start Step Functions workflows
- Simple data operations

---

## 6. VPC Link Integration

### Architecture
```
┌────────┐    ┌─────────────┐    ┌─────────┐    ┌──────────────┐
│ Client │ ─> │ API Gateway │ ─> │ VPC Link│ ─> │ Private VPC  │
└────────┘    └─────────────┘    └─────────┘    │ Resources:   │
               (Public)           (Bridge)       │ - EC2        │
                                                 │ - ECS        │
                                                 │ - ALB/NLB    │
                                                 └──────────────┘
```

### Characteristics
- **Purpose**: Connect to private VPC resources
- **Network Load Balancer**: Required for VPC Link
- **Security**: Resources never exposed publicly
- **Types**: VPC Link for REST API, VPC Link for HTTP API

### VPC Link Configuration

#### Step 1: Create Network Load Balancer
```yaml
resources:
  Resources:
    # Network Load Balancer for VPC Link
    MicroserviceNLB:
      Type: AWS::ElasticLoadBalancingV2::LoadBalancer
      Properties:
        Name: microstore-nlb
        Type: network
        Scheme: internal
        Subnets:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
        Tags:
          - Key: Name
            Value: MicroStore-NLB
    
    # Target Group for Product Service
    ProductServiceTargetGroup:
      Type: AWS::ElasticLoadBalancingV2::TargetGroup
      Properties:
        Name: product-service-tg
        Port: 3002
        Protocol: TCP
        TargetType: ip
        VpcId: !Ref VPC
        HealthCheckEnabled: true
        HealthCheckProtocol: HTTP
        HealthCheckPath: /health
```

#### Step 2: Create VPC Link
```yaml
resources:
  Resources:
    # VPC Link for HTTP API
    MicroserviceVpcLink:
      Type: AWS::ApiGatewayV2::VpcLink
      Properties:
        Name: microstore-vpc-link
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
        SecurityGroupIds:
          - !Ref VpcLinkSecurityGroup
```

#### Step 3: Configure API Gateway Integration
```yaml
functions:
  vpcLinkIntegration:
    handler: not_needed
    events:
      - httpApi:
          path: /products-vpc
          method: get
          integration:
            type: http_proxy
            connectionType: VPC_LINK
            connectionId: !Ref MicroserviceVpcLink
            uri: http://${self:custom.nlbDns}/products
```

### Security Configuration
```yaml
resources:
  Resources:
    VpcLinkSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Security group for VPC Link
        VpcId: !Ref VPC
        SecurityGroupIngress:
          - IpProtocol: tcp
            FromPort: 3001
            ToPort: 3003
            SourceSecurityGroupId: !Ref ApiGatewaySecurityGroup
        SecurityGroupEgress:
          - IpProtocol: -1
            CidrIp: 0.0.0.0/0
```

### Pros
✅ Keep resources private  
✅ Enhanced security  
✅ Direct VPC access  
✅ No public IPs needed  

### Cons
❌ NLB cost  
❌ Complex setup  
❌ VPC Link cost  
❌ More infrastructure to manage  

### Use Cases
- Private microservices in VPC
- EC2/ECS services not publicly exposed
- Compliance requirements (no public access)
- Integration with on-premises via VPN/Direct Connect

---

## 7. Mock Integration

### Architecture
```
┌────────┐         ┌─────────────┐
│ Client │ ──────> │ API Gateway │ ──────> (Returns mock data)
└────────┘         └─────────────┘
```

### Characteristics
- **Type**: `MOCK` or `mock`
- **No backend**: API Gateway returns response directly
- **Static responses**: Defined in mapping templates
- **Use cases**: Testing, documentation, API contracts

### Configuration Example
```yaml
functions:
  mockEndpoint:
    handler: not_needed
    events:
      - httpApi:
          path: /mock/products
          method: get
          integration:
            type: mock
            requestTemplates:
              application/json: |
                {
                  "statusCode": 200
                }
            integrationResponses:
              - statusCode: 200
                responseTemplates:
                  application/json: |
                    {
                      "products": [
                        {
                          "id": "1",
                          "name": "Mock Product",
                          "price": 99.99
                        }
                      ],
                      "mock": true
                    }
```

### Pros
✅ Zero backend cost  
✅ Always available  
✅ Fast response  
✅ Great for testing  

### Cons
❌ Static data only  
❌ No business logic  
❌ Limited use cases  

### Use Cases
- API prototyping
- Frontend development before backend ready
- Health checks
- Documentation examples

---

## Mapping Templates with VTL

### Velocity Template Language (VTL) Basics

VTL is used to transform requests and responses in API Gateway.

### Common VTL Variables

```velocity
## Context variables
$context.requestId          # Unique request ID
$context.requestTime        # Request timestamp
$context.authorizer.sub     # Authorized user ID
$context.httpMethod         # GET, POST, etc.

## Input variables
$input.body                 # Request body as string
$input.json('$')            # Request body as JSON
$input.json('$.field')      # Specific JSON field
$input.params('param')      # Query/path parameter
$input.path('$.field')      # JSON path

## Utility functions
$util.escapeJavaScript()    # Escape JavaScript
$util.urlEncode()           # URL encoding
$util.urlDecode()           # URL decoding
$util.base64Encode()        # Base64 encoding
$util.base64Decode()        # Base64 decoding
```

### Example 1: Add User Context to Request
```velocity
## Add authenticated user info to backend request
{
  "userId": "$context.authorizer.sub",
  "username": "$context.authorizer.username",
  "requestTime": "$context.requestTime",
  "data": $input.json('$')
}
```

### Example 2: Transform Query Parameters
```velocity
## Convert query params to JSON object
{
  "filters": {
    "category": "$input.params('category')",
    "minPrice": $input.params('minPrice'),
    "maxPrice": $input.params('maxPrice')
  },
  "pagination": {
    "page": $input.params('page'),
    "limit": $input.params('limit')
  }
}
```

### Example 3: Error Handling
```velocity
## Custom error response
#set($inputRoot = $input.path('$'))
#if($inputRoot.errorMessage)
{
  "error": {
    "code": "$inputRoot.errorType",
    "message": "$util.escapeJavaScript($inputRoot.errorMessage)",
    "requestId": "$context.requestId"
  }
}
#else
{
  "data": $inputRoot
}
#end
```

### Example 4: Response Pagination Wrapper
```velocity
## Add pagination metadata
#set($inputRoot = $input.path('$'))
{
  "items": $inputRoot.items,
  "pagination": {
    "total": $inputRoot.total,
    "page": $inputRoot.page,
    "limit": $inputRoot.limit,
    "hasMore": #if($inputRoot.page * $inputRoot.limit < $inputRoot.total)true#{else}false#end
  },
  "links": {
    "self": "$context.domainName$context.resourcePath",
    "next": #if($inputRoot.page * $inputRoot.limit < $inputRoot.total)"$context.domainName$context.resourcePath?page=${inputRoot.page + 1}"#{else}null#end
  }
}
```

---

## Comparison Table

| Feature | Lambda Proxy | Lambda Non-Proxy | HTTP Proxy | HTTP Non-Proxy | AWS Service | VPC Link |
|---------|-------------|------------------|------------|----------------|-------------|----------|
| **Backend** | Lambda | Lambda | HTTP | HTTP | AWS Service | Private VPC |
| **Cost** | 💰💰💰 | 💰💰💰 | 💰 | 💰 | 💰 | 💰💰 |
| **Latency** | Medium | Medium | Low | Low | Low | Medium |
| **Complexity** | Low | High | Low | High | Very High | High |
| **Transform Request** | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Transform Response** | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Business Logic** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (backend) |
| **Learning Curve** | Easy | Hard | Easy | Hard | Very Hard | Medium |
| **Use VTL** | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Flexibility** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

---

## When to Use Each Integration Type

### Use Lambda Proxy When:
- ✅ You need full control and flexibility
- ✅ Complex routing logic required
- ✅ Dynamic backend selection
- ✅ Need access to full request context
- ✅ Rapid development (easiest to debug)

**Example**: MicroStore gateway that routes to multiple services

### Use Lambda Non-Proxy When:
- ✅ Lambda should focus on business logic
- ✅ Standardize request/response formats
- ✅ Reuse existing Lambda functions
- ✅ Separate transformation from logic

**Example**: Transform API Gateway format to legacy Lambda input

### Use HTTP Proxy When:
- ✅ Backend returns correct format already
- ✅ Cost optimization (no Lambda)
- ✅ Low latency required
- ✅ Simple pass-through

**Example**: Public REST API that doesn't need transformation

### Use HTTP Non-Proxy When:
- ✅ Backend needs format conversion
- ✅ Standardize multiple backends
- ✅ Add metadata without Lambda
- ✅ Cost-conscious transformation

**Example**: Legacy backend with custom format

### Use AWS Service Integration When:
- ✅ Simple CRUD operations
- ✅ Direct DynamoDB access
- ✅ Event publishing (SNS/SQS)
- ✅ Workflow triggers (Step Functions)

**Example**: RESTful API for DynamoDB table

### Use VPC Link When:
- ✅ Backend in private VPC
- ✅ Security/compliance requirements
- ✅ No public access allowed
- ✅ Integration with on-premises

**Example**: Private microservices on ECS

### Use Mock When:
- ✅ API prototyping
- ✅ Frontend development
- ✅ Testing
- ✅ Documentation

**Example**: Demo API for documentation

---

## Best Practices

### 1. Start Simple
Begin with Lambda Proxy, then optimize to other types as needed.

### 2. Security First
- Always use HTTPS
- Implement authorization
- Use VPC Link for private resources
- Apply principle of least privilege for IAM roles

### 3. Cost Optimization
- Use HTTP integration instead of Lambda when possible
- Cache responses for read-heavy endpoints
- Use AWS Service integration for simple operations

### 4. Error Handling
- Always define error response mappings
- Return consistent error formats
- Log errors to CloudWatch

### 5. Testing
- Test each integration type thoroughly
- Use serverless-offline for local development
- Create comprehensive test suites

### 6. Documentation
- Document VTL templates clearly
- Maintain architecture diagrams
- Keep API documentation updated

---

## Conclusion

Each integration type has its place:

1. **Lambda Proxy** - Default choice for flexibility
2. **Lambda Non-Proxy** - When transformation needed
3. **HTTP Proxy/Non-Proxy** - For HTTP backends
4. **AWS Service** - For direct AWS integration
5. **VPC Link** - For private resources
6. **Mock** - For testing and prototyping

Choose based on:
- Cost requirements
- Latency needs
- Security constraints
- Complexity tolerance
- Team expertise

The MicroStore project demonstrates multiple integration types, providing real-world examples of each pattern.

