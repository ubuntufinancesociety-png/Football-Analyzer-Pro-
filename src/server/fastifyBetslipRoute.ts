import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { processBookingCodeRequest, BookingCodeRequest } from './bookingEngine';

/**
 * Fastify route plugin for Football Analyzer Pro booking code generator
 * Mounts: POST /api/betslip/generate-code
 */
export const fastifyBetslipRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // JSON schema for request validation & documentation
  const generateCodeSchema = {
    description: 'Generate standardized booking code and deep-link URL for bookmakers like Hollywoodbets or Betway',
    tags: ['Betslip', 'BookingCode'],
    body: {
      type: 'object',
      required: ['legs'],
      properties: {
        legs: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['selection', 'odds'],
            properties: {
              id: { type: 'string' },
              matchTitle: { type: 'string' },
              homeTeam: { type: 'string' },
              awayTeam: { type: 'string' },
              league: { type: 'string' },
              market: { type: 'string' },
              selection: { type: 'string' },
              odds: { type: 'number', minimum: 1.01 },
              kickoff: { type: 'string' },
              source: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        },
        bookmaker: {
          type: 'string',
          default: 'Hollywoodbets',
        },
        stake: {
          type: 'number',
          minimum: 1,
          default: 50,
        },
        currency: {
          type: 'string',
          default: 'R',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          bookingCode: { type: 'string' },
          bookmaker: { type: 'string' },
          bookmakerId: { type: 'string' },
          totalOdds: { type: 'number' },
          totalLegs: { type: 'number' },
          stake: { type: 'number' },
          potentialPayout: { type: 'number' },
          potentialProfit: { type: 'number' },
          currency: { type: 'string' },
          impliedProbability: { type: 'number' },
          systemType: { type: 'string' },
          deepLinkUrl: { type: 'string' },
          mobileAppSchemeUrl: { type: 'string' },
          transferPayload: {
            type: 'object',
            properties: {
              bookingCode: { type: 'string' },
              bookmaker: { type: 'string' },
              bookmakerId: { type: 'string' },
              totalLegs: { type: 'number' },
              totalOdds: { type: 'number' },
              stake: { type: 'number' },
              currency: { type: 'string' },
              potentialPayout: { type: 'number' },
              potentialProfit: { type: 'number' },
              systemType: { type: 'string' },
              selections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    legId: { type: 'string' },
                    match: { type: 'string' },
                    homeTeam: { type: 'string' },
                    awayTeam: { type: 'string' },
                    league: { type: 'string' },
                    market: { type: 'string' },
                    selection: { type: 'string' },
                    odds: { type: 'number' },
                    kickoff: { type: 'string' },
                    standardMarketCode: { type: 'string' },
                  },
                },
              },
              disclaimer: { type: 'string' },
            },
          },
          formattedSlipText: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
      400: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
        },
      },
      500: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: { type: 'string' },
        },
      },
    },
  };

  fastify.post<{ Body: BookingCodeRequest }>(
    '/api/betslip/generate-code',
    { schema: generateCodeSchema },
    async (request: FastifyRequest<{ Body: BookingCodeRequest }>, reply: FastifyReply) => {
      try {
        const payload = processBookingCodeRequest(request.body);
        return reply.status(200).send(payload);
      } catch (err: any) {
        request.log.error(err, 'Failed to generate booking code');
        return reply.status(400).send({
          success: false,
          error: err.message || 'Failed to process betslip booking code request',
        });
      }
    }
  );
};

export default fastifyBetslipRoute;
