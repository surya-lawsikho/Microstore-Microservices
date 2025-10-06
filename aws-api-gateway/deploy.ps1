# AWS API Gateway Deployment Script for MicroStore POC (PowerShell)
# This script deploys the API Gateway to AWS

Write-Host "🚀 Starting AWS API Gateway deployment for MicroStore POC..." -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if Serverless Framework is installed
try {
    serverless --version | Out-Null
    Write-Host "✅ Serverless Framework is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Serverless Framework is not installed. Installing globally..." -ForegroundColor Yellow
    npm install -g serverless
}

# Check AWS credentials
Write-Host "🔐 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $awsAccount = aws sts get-caller-identity --query Account --output text
    $awsRegion = aws configure get region
    if (-not $awsRegion) { $awsRegion = "us-east-1" }
    Write-Host "✅ AWS Account: $awsAccount" -ForegroundColor Green
    Write-Host "✅ AWS Region: $awsRegion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "⚠️  Please edit .env file with your configuration before continuing." -ForegroundColor Yellow
    Read-Host "Press Enter when ready to continue"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Deploy to development stage
Write-Host "🚀 Deploying to development stage..." -ForegroundColor Yellow
serverless deploy --stage dev --verbose

# Get the API Gateway URL
$apiUrl = serverless info --stage dev | Select-String "endpoint:" | ForEach-Object { $_.Line.Split(":")[1].Trim() }

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host "🌐 API Gateway URL: $apiUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Test your API:" -ForegroundColor Yellow
Write-Host "curl $apiUrl/health" -ForegroundColor White
Write-Host ""
Write-Host "📖 View API documentation:" -ForegroundColor Yellow
Write-Host "curl $apiUrl/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To update your frontend to use the new API:" -ForegroundColor Yellow
Write-Host "Update REACT_APP_API_URL in your frontend .env to: $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitor your API in AWS Console:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/apigateway/home?region=$awsRegion" -ForegroundColor White
Write-Host ""
Write-Host "💰 Remember to clean up resources when done:" -ForegroundColor Yellow
Write-Host "npm run remove" -ForegroundColor White
