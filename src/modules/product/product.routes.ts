import { FastifyInstance } from "fastify";
import {
  addProductBarcode,
  addProductImage,
  createProduct,
  createProductCat,
  createProductVariant,
  createUOM,
  deleteProduct,
  deleteProductBarcode,
  deleteProductCat,
  deleteProductImage,
  deleteProductVariant,
  deleteUOM,
  findProductByBarcode,
  getAllProducts,
  getProductBarcodes,
  getProductById,
  getProductCat,
  getProductImages,
  getProductVariants,
  getUOM,
  searchProducts,
  updateProduct,
  updateProductBarcode,
  updateProductCat,
  updateProductImage,
  updateProductVariant,
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

  // Product
  app.post("/products", createProduct);
  app.get("/products", getAllProducts);
  app.get("/products/search", searchProducts);
  app.get("/products/barcode/:barcode", findProductByBarcode);
  app.get("/products/:id", getProductById);
  app.post("/products/:id", updateProduct);
  app.post("/products/:id", deleteProduct);

  // ===== PRODUCT VARIANT ROUTES =====
  app.post("/products/:product_id/variants", createProductVariant);
  app.get("/products/:product_id/variants", getProductVariants);
  app.post("/variants/:id", updateProductVariant);
  app.post("/variants/:id", deleteProductVariant);

  // ===== PRODUCT IMAGE ROUTES =====
  app.post("/products/:product_id/images", addProductImage);
  app.get("/products/:product_id/images", getProductImages);
  app.post("/images/:id", updateProductImage);
  app.post("/images/:id", deleteProductImage);

  // ===== PRODUCT BARCODE ROUTES =====
  app.post("/variants/:variant_id/barcodes", addProductBarcode);
  app.get("/variants/:variant_id/barcodes", getProductBarcodes);
  app.post("/barcodes/:id", updateProductBarcode);
  app.post("/barcodes/:id", deleteProductBarcode);
}
