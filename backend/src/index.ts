import { buildApp } from './app';
import { env } from './env';

// --------------------------------------------------------------------------
// SERVER ENTRY POINT
// --------------------------------------------------------------------------
// Starts the Fastify server using the configuration from app.ts and env.ts
// --------------------------------------------------------------------------

const start = async () => {
  const app = await buildApp();

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