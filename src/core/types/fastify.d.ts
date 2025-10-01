import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }

  interface FastifyRequest {
    user?: {
      id: number;
      email?: string;
      role?: number;
    };
  }
}
