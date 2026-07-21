import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini Order & Inventory API',
      version: '1.0.0',
      description: 'A backend service for managing products, users, and orders with MongoDB transactional guarantees.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'JWT access token obtained from /api/v1/auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Descriptive error message' },
            details: { type: 'array', items: { type: 'object' }, example: [] },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            perPage: { type: 'integer', example: 15 },
            total: { type: 'integer', example: 50 },
            totalPages: { type: 'integer', example: 4 },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Products', description: 'Product CRUD endpoints' },
      { name: 'Orders', description: 'Order endpoints' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/utils/AppError.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
