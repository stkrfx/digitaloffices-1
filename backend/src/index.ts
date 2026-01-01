import { buildApp } from './app.js';
import { env } from './env.js';

// --------------------------------------------------------------------------
// SERVER ENTRY POINT
// --------------------------------------------------------------------------
// Starts the Fastify server using the configuration from app.ts and env.ts
// --------------------------------------------------------------------------

const start = async () => {
    const app = await buildApp();

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
        process.on(signal, async () => {
            app.log.info(`Received ${signal}, closing server...`);
            await app.close();
            process.exit(0);
        });
    }

    try {
        // Listen on 0.0.0.0 to accept connections from outside the container/VM
        await app.listen({ port: env.PORT, host: '0.0.0.0' });

        app.log.info(`🚀 Digital Offices Backend running on port ${env.PORT}`);
        app.log.info(`Environment: ${env.NODE_ENV}`);

        // In development, print the route tree for easy debugging
        if (env.NODE_ENV === 'development') {
            // console.log(app.printRoutes()); 
            // Uncomment strictly if needed, can be noisy in some terminals
        }

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();