import { CrudModel } from "../../core/models/crud.model";

export const marketingMsgModel = new CrudModel(
  "marketing_messages",
  ["code", "campaign_name", "title", "content", "template_name"],
  [],
  ["status"],
);
export const messageHistoryModel = new CrudModel(
  "message_history",
  ["code", "campaign_name", "title", "content", "template_name"],
  [],
  ["status"],
);
