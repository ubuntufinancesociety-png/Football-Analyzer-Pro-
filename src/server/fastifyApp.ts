import Fastify, { FastifyInstance } from 'fastify';
import { fastifyBetslipRoute } from './fastifyBetslipRoute';

/**
 * Creates and configures a standalone Fastify server instance
 * with the betslip booking code generator route mounted.
 */
export async function createFastifyApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  });

  // Health check route
  app.get('/api/health', async () => {
    return { status: 'ok', service: 'Football Analyzer Pro Fastify Engine', timestamp: new Date().toISOString() };
  });

  // Register the betslip booking code generator plugin
  await app.register(fastifyBetslipRoute);

  return app;
}

export default createFastifyApp;
