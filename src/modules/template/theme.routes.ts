import { FastifyInstance } from "fastify";
import {
  createTheme,
  getThemes,
  getThemeById,
  updateTheme,
  deleteTheme,
  createComponentType,
  getComponentTypes,
  createComponentVariant,
  getComponentVariants,
  createThemeSection,
  updateThemeSection,
  deleteThemeSection,
  getActiveTheme,
} from "./theme.controller";

export async function themeRoutes(app: FastifyInstance) {
  /* ========= THEMES ========= */
  app.post("/themes/create", createTheme);
  app.get("/themes/list", getThemes);
  app.post("/themes/get", getThemeById);
  app.post("/themes/update", updateTheme);
  app.post("/themes/delete", deleteTheme);

  /* ========= COMPONENT TYPES ========= */
  app.post("/component-types/create", createComponentType);
  app.get("/component-types/list", getComponentTypes);

  /* ========= COMPONENT VARIANTS ========= */
  app.post("/component-variants/create", createComponentVariant);
  app.get("/component-variants/list", getComponentVariants);

  /* ========= THEME SECTIONS ========= */
  app.post("/theme-sections/create", createThemeSection);
  app.post("/theme-sections/update", updateThemeSection);
  app.post("/theme-sections/delete", deleteThemeSection);

  app.get("/active", getActiveTheme);
}
