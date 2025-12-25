import fp from "fastify-plugin";
import fastifyJwt from "fastify-jwt";
import { FastifyRequest, FastifyReply } from "fastify";
export default fp(async function (fastify) {
  if (!fastify.hasDecorator("jwt")) {
    fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || "supersecret",
      cookie: {
        cookieName: "token", // the cookie that stores JWT
        signed: false, // not signed, just plain JWT
      },
      sign: {
        expiresIn: "90d",
      },
    });
  }

  if (!fastify.hasDecorator("authenticate")) {
    fastify.decorate(
      "authenticate",
      async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          await req.jwtVerify(); // this populates req.user
        } catch (err) {
          reply.code(401).send({ message: "Unauthorized" });
        }
      }
    );
  }
});
