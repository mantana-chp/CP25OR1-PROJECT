import express from 'express';
import v1Router from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/request-logger';

const app = express();

app.use(express.json());

// Request Logger
app.use(requestLogger);

// Mount v1 routes
app.use('/v1', v1Router);

// Global error handler
app.use(errorHandler);

export default app;