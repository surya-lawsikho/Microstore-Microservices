# MicroStore Frontend

A modern React frontend application that integrates with the MicroStore microservices backend.

## Features

- **Modern React Architecture**: Built with React 18, TypeScript, and functional components
- **State Management**: Redux Toolkit for predictable state management
- **Routing**: React Router for client-side routing with protected routes
- **API Integration**: Axios-based API service with interceptors for authentication and error handling
- **UI Components**: Beautiful, responsive UI built with Tailwind CSS
- **Error Handling**: Comprehensive error handling with retry logic and user feedback
- **Authentication**: JWT-based authentication with protected routes
- **Shopping Cart**: Full cart functionality with real-time updates
- **Order Management**: Complete order history and management

## Tech Stack

- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **React Router** for routing
- **Axios** for API calls
- **Tailwind CSS** for styling
- **React Hot Toast** for notifications
- **Heroicons** for icons

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Running MicroStore backend services

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Update the API URL in `.env` if needed:
   ```
   REACT_APP_API_URL=http://localhost:8080
   ```

4. Start the development server:
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout components (Header, Sidebar)
│   ├── Products/       # Product-related components
│   └── UI/             # Generic UI components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API service layer
├── store/              # Redux store and slices
└── types/              # TypeScript type definitions
```

## Key Features

### Authentication
- User registration and login
- JWT token management
- Protected routes
- Automatic token refresh

### Product Management
- Product listing with search and filtering
- Product details view
- Add to cart functionality
- Stock management

### Shopping Cart
- Add/remove items
- Quantity management
- Real-time total calculation
- Persistent cart state

### Order Management
- Order creation
- Order history
- Order details view

### Error Handling
- Network error retry logic
- User-friendly error messages
- Loading states
- Error boundaries

## API Integration

The frontend communicates with the backend through the API Gateway at `http://localhost:8080`. All API calls are handled through the centralized API service with:

- Automatic authentication header injection
- Request/response interceptors
- Error handling and retry logic
- Loading state management

## State Management

The application uses Redux Toolkit with the following slices:

- **authSlice**: User authentication state
- **productSlice**: Product catalog state
- **orderSlice**: Shopping cart and orders state
- **uiSlice**: UI state (sidebar, theme, notifications)

## Styling

The application uses Tailwind CSS for styling with:
- Responsive design
- Dark/light theme support
- Custom color palette
- Component-based styling

## Development

### Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Error boundaries for error handling

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Serve the `build` folder with any static file server

3. Update the API URL environment variable for production

## Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Write tests for new components
4. Update documentation as needed