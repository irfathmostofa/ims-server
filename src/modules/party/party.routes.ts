import { FastifyInstance } from "fastify";
import {
  createParty,
  deleteParty,
  getParty,
  updateParty,
} from "./party.controller";

export default async function partyRoutes(app: FastifyInstance) {
  //   app.addHook("onRequest", app.authenticate);
  // party
  app.post("/create-party", createParty);
  app.post("/get-party", getParty);
  app.post("/update-party/:id", updateParty);
  app.post("/delete-party", deleteParty);
}
