// history.service.ts

import pool from "../../config/db";

export class HistoryService {
  // Create message history record
  static async createHistoryRecord(data: {
    message_id: number;
    party_id?: string;
    recipient_phone: string;
  }): Promise<any> {
    const result = await pool.query(
      `INSERT INTO message_history 
       (message_id, party_id, recipient_phone, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING id`,
      [data.message_id, data.party_id, data.recipient_phone],
    );
    return result.rows[0];
  }

  // Update message status
  static async updateMessageStatus(
    historyId: number,
    status: "sent" | "delivered" | "failed",
    whatsappMessageId?: string,
    errorMessage?: string,
  ): Promise<void> {
    let queryText = "";
    let params: any[] = [];

    if (status === "sent") {
      queryText = `
        UPDATE message_history 
        SET status = $1, 
            delivery_status = 'sent',
            whatsapp_message_id = $2
        WHERE id = $3
      `;
      params = [status, whatsappMessageId, historyId];
    } else if (status === "delivered") {
      queryText = `
        UPDATE message_history 
        SET status = $1, 
            delivery_status = 'delivered',
            delivered_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `;
      params = [status, historyId];
    } else if (status === "failed") {
      queryText = `
        UPDATE message_history 
        SET status = $1, 
            delivery_status = 'failed',
            error_message = $2 
        WHERE id = $3
      `;
      params = [status, errorMessage, historyId];
    }

    if (queryText) {
      await pool.query(queryText, params);
    }
  }

  // Get message history for a recipient
  static async getHistoryByPhone(phone: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT mh.*, mm.title as message_title, mm.campaign_name
       FROM message_history mh
       JOIN marketing_messages mm ON mh.message_id = mm.id
       WHERE mh.recipient_phone = $1
       ORDER BY mh.created_at DESC`,
      [phone],
    );
    return result.rows;
  }

  // Get message history for a party
  static async getHistoryByParty(partyId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT mh.*, mm.title as message_title, mm.campaign_name
       FROM message_history mh
       JOIN marketing_messages mm ON mh.message_id = mm.id
       WHERE mh.party_id = $1
       ORDER BY mh.created_at DESC`,
      [partyId],
    );
    return result.rows;
  }

  // Get message history for a campaign/message
  static async getHistoryByMessage(messageId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT mh.*, mm.title as message_title
       FROM message_history mh
       JOIN marketing_messages mm ON mh.message_id = mm.id
       WHERE mh.message_id = $1
       ORDER BY mh.created_at DESC`,
      [messageId],
    );
    return result.rows;
  }
}
