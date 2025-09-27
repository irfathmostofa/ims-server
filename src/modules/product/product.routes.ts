import { FastifyInstance } from "fastify";
import {
  createProductCat,
  createUOM,
  deleteProductCat,
  deleteUOM,
  getProductCat,
  getUOM,
  updateProductCat,
  updateUOM,
} from "./product.controller";

export default async function productRoutes(app: FastifyInstance) {
  //   app.addHook("onRequest", app.authenticate);
  // product category
  app.post("/create-product-cat", createProductCat);
  app.get("/get-product-cat", getProductCat);
  app.post("/update-product-cat/:id", updateProductCat);
  app.post("/delete-product-cat", deleteProductCat);
  // UOM
  app.post("/create-uom", createUOM);
  app.get("/get-uom", getUOM);
  app.post("/update-uom/:id", updateUOM);
  app.post("/delete-uom", deleteUOM);
}
