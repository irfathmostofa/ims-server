// whatsapp.service.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { HistoryService } from "./marketing.service";
import { marketingMsgModel } from "./marketing.model";

export async function sendWhatsAppMessage(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const { mode, phone, phones, message_id, party_id } = req.body as any;

  // Validate inputs
  if (!message_id) {
    return reply.status(400).send({ error: "Message ID is required" });
  }

  // Get the marketing message
  const marketingMessage = await marketingMsgModel.findById(message_id);
  if (!marketingMessage) {
    return reply.status(404).send({ error: "Marketing message not found" });
  }

  if (marketingMessage.status !== "active") {
    return reply.status(400).send({ error: "Marketing message is not active" });
  }

  // Determine recipients
  let recipients: string[] = [];

  if (mode === "single") {
    if (!phone) {
      return reply
        .status(400)
        .send({ error: "Phone number is required for single mode" });
    }
    recipients = [phone];
  } else if (mode === "bulk") {
    if (!phones || phones.length === 0) {
      return reply
        .status(400)
        .send({ error: "Phone numbers array is required for bulk mode" });
    }
    recipients = phones;
  } else {
    return reply
      .status(400)
      .send({ error: "Invalid mode. Use 'single' or 'bulk'" });
  }

  // Validate phone numbers
  const validRecipients = recipients.filter((phone) => {
    // Simple phone validation - adjust as needed
    return phone && phone.length >= 10 && /^[0-9+]+$/.test(phone);
  });

  if (validRecipients.length === 0) {
    return reply.status(400).send({ error: "No valid phone numbers provided" });
  }

  // Send messages
  const results = [];

  for (const recipient of validRecipients) {
    try {
      // 1. Create history record
      const historyRecord = await HistoryService.createHistoryRecord({
        message_id,
        party_id,
        recipient_phone: recipient,
      });

      const historyId = historyRecord.id;

      try {
        // 2. Send via WhatsApp API
        const response = await fetch(
          `https://graph.facebook.com/v22.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: recipient,
              type: "template",
              template: {
                name: marketingMessage.template_name || marketingMessage.code,
                language: { code: "en_US" },
              },
            }),
          },
        );

        const result = await response.json();

        if (response.ok && result.messages?.[0]?.id) {
          // 3. Update history with success
          await HistoryService.updateMessageStatus(
            historyId,
            "sent",
            result.messages[0].id,
          );

          results.push({
            phone: recipient,
            success: true,
            message_id: result.messages[0].id,
            history_id: historyId,
          });
        } else {
          // 4. Update history with error
          const errorMsg = result.error?.message || JSON.stringify(result);
          await HistoryService.updateMessageStatus(
            historyId,
            "failed",
            undefined,
            errorMsg,
          );

          results.push({
            phone: recipient,
            success: false,
            error: errorMsg,
            history_id: historyId,
          });
        }
      } catch (apiError) {
        // 5. Handle API errors
        const errorMsg =
          apiError instanceof Error ? apiError.message : "API call failed";
        await HistoryService.updateMessageStatus(
          historyId,
          "failed",
          undefined,
          errorMsg,
        );

        results.push({
          phone: recipient,
          success: false,
          error: errorMsg,
          history_id: historyId,
        });
      }
    } catch (dbError) {
      // Skip this recipient if we can't create history
      console.error(`Failed to process recipient ${recipient}:`, dbError);
      results.push({
        phone: recipient,
        success: false,
        error: "Database error",
      });
    }
  }

  // Prepare response
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  reply.send({
    success: true,
    summary: {
      total_recipients: validRecipients.length,
      attempted: results.length,
      successful: successful.length,
      failed: failed.length,
      message_id,
      campaign_name: marketingMessage.campaign_name,
    },
    details: results,
  });
}
