#!/bin/bash

# AWS API Gateway Deployment Script for MicroStore POC
# This script deploys the API Gateway to AWS

set -e

echo "🚀 Starting AWS API Gateway deployment for MicroStore POC..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null; then
    echo "❌ Serverless Framework is not installed. Installing globally..."
    npm install -g serverless
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo "✅ AWS Account: $AWS_ACCOUNT_ID"
echo "✅ AWS Region: $AWS_REGION"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "Press Enter when ready to continue..."
    read
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to development stage
echo "🚀 Deploying to development stage..."
serverless deploy --stage dev --verbose

# Get the API Gateway URL
API_URL=$(serverless info --stage dev | grep "endpoint:" | awk '{print $2}')
echo ""
echo "✅ Deployment successful!"
echo "🌐 API Gateway URL: $API_URL"
echo ""
echo "📋 Test your API:"
echo "curl $API_URL/health"
echo ""
echo "📖 View API documentation:"
echo "curl $API_URL/api-docs"
echo ""
echo "🔧 To update your frontend to use the new API:"
echo "Update REACT_APP_API_URL in your frontend .env to: $API_URL"
echo ""
echo "📊 Monitor your API in AWS Console:"
echo "https://console.aws.amazon.com/apigateway/home?region=$AWS_REGION"
echo ""
echo "💰 Remember to clean up resources when done:"
echo "npm run remove"
