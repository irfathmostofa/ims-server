import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any; // keep as-is or type it stricter
  }

  interface FastifyRequest {
    user?: {
      id: number;
      email?: string;
      role?: number;
    };
  }
}
