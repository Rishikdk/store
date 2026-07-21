process.env.DATABASE_URL ||= 'mongodb://localhost:27017/testdb';
process.env.JWT_ACCESS_SECRET ||= 'this-is-a-super-secret-jwt-access-key-for-testing-purposes';
process.env.JWT_ACCESS_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
process.env.CORS_ORIGIN ||= '*';
process.env.PORT ||= '3001';
