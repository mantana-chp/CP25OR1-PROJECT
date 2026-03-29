import express from 'express';
// import cors from 'cors';
import helmet from 'helmet';
// import swaggerUi from 'swagger-ui-express';
import v1Router from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/request-logger';
// import swaggerSpec from './libs/swagger';

const app = express();

app.use(express.json());
// app.use(cors());
app.use(helmet()); // Use helmet for security

// Request Logger
app.use(requestLogger);

// Swagger UI
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount v1 routes
app.use('/v1', v1Router);

// Global error handler
app.use(errorHandler);

export default app;