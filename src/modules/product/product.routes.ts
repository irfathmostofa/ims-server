import { FastifyInstance } from "fastify";
import {
  addProductBarcode,
  addProductImage,
  bulkCreateProducts,
  createProduct,
  createProductCat,
  createProductReview,
  createProductVariant,
  createUOM,
  deleteProduct,
  deleteProductBarcode,
  deleteProductCat,
  deleteProductImage,
  deleteProductReview,
  deleteProductVariant,
  deleteUOM,
  findProductByBarcode,
  getAllProducts,
  getProductBarcodes,
  getProductById,
  getProductCat,
  getProductImages,
  getProductReviews,
  getProductsPOS,
  getProductVariants,
  getUOM,
  searchProducts,
  updateProduct,
  updateProductBarcode,
  updateProductCat,
  updateProductImage,
  updateProductReview,
  updateProductVariant,
  updateUOM,
} from "./product.controller";

export default async function productRoutes(app: FastifyInstance) {
  // app.addHook("onRequest", app.authenticate);
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
  app.post("/products", { preHandler: [app.authenticate] }, createProduct);
  app.post("/bulk-products", bulkCreateProducts);
  app.post("/get-all-products", getAllProducts);
  app.post("/get-pos-products", getProductsPOS);
  app.get("/products/search", searchProducts);
  app.get("/products/barcode/:barcode", findProductByBarcode);
  app.get("/products/:id", getProductById);
  app.post("/update-products/:id", updateProduct);
  app.post("/delete-products/:id", deleteProduct);

  // ===== PRODUCT VARIANT ROUTES =====
  app.post("/products/:product_id/variants", createProductVariant);
  app.get("/products/:product_id/variants", getProductVariants);
  app.post("/update-variants/:id", updateProductVariant);
  app.post("/delete-variants/:id", deleteProductVariant);

  // ===== PRODUCT IMAGE ROUTES =====
  app.post("/products/:product_id/images", addProductImage);
  app.get("/products/:product_id/images", getProductImages);
  app.post("/update-images/:id", updateProductImage);
  app.post("/delete-images/:id", deleteProductImage);

  // ===== PRODUCT BARCODE ROUTES =====
  app.post("/variants/:variant_id/barcodes", addProductBarcode);
  app.get("/variants/:variant_id/barcodes", getProductBarcodes);
  app.post("/update-barcodes/:id", updateProductBarcode);
  app.post("/delete-barcodes/:id", deleteProductBarcode);

  // ===== PRODUCT REVIEW ROUTES =====
  app.post("/create-reviews", createProductReview);
  app.get("/get-products-reviews", getProductReviews);
  app.post("/update-reviews", updateProductReview);
  app.post("/delete-reviews", deleteProductReview);
}
