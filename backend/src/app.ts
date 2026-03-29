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

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'none'"], // Deny all by default
                frameAncestors: ["'none'"], // Prevent clickjacking
                formAction: ["'none'"], // Fixes ZAP alert - No form submissions
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        // HSTS only in production with HTTPS
        hsts:
            process.env.NODE_ENV === 'production'
                ? {
                    maxAge: 31536000, // 1 year
                    includeSubDomains: true,
                    preload: true,
                }
                : false,
        ieNoOpen: true,
        noSniff: true, // X-Content-Type-Options: nosniff
        referrerPolicy: { policy: 'no-referrer' }, // Don't leak referrer info
    })
);

// Request Logger
app.use(requestLogger);

// Swagger UI
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount v1 routes
app.use('/v1', v1Router);

// Global error handler
app.use(errorHandler);

export default app;