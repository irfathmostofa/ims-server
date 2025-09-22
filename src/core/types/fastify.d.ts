import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any; // you can type this stricter later
  }
}
