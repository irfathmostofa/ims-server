import pool from "../../config/db";

export class CrudModel {
  constructor(
    private table: string,
    private requiredFields: string[] = [],
    private uniqueFields: string[] = [],
    private optionalFields: string[] = [] 
  ) {}

  // ✅ Sanitize data: empty string → null, remove undefined
  private sanitizeData(data: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(data)
        .map(([key, value]) => [key, value === "" ? null : value])
        .filter(
          ([key, value]) =>
            value !== undefined || this.optionalFields.includes(key)
        )
    );
  }

  // ✅ Validate required fields
  private validateRequired(data: Record<string, any>) {
    const missingFields = this.requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null
    );
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
  }

  // ✅ Check duplicates
  private async checkDuplicates(data: Record<string, any>, excludeId?: number) {
    for (const field of this.uniqueFields) {
      if (!(field in data)) continue;

      let query = `SELECT id FROM ${this.table} WHERE ${field} = $1`;
      const values: any[] = [data[field]];

      if (excludeId) {
        query += ` AND id != $2`;
        values.push(excludeId);
      }

      const { rows } = await pool.query(query, values);
      if (rows.length > 0) {
        throw new Error(`${field} "${data[field]}" already exists`);
      }
    }
  }

  async findAll() {
    const { rows } = await pool.query(`SELECT * FROM ${this.table}`);
    return rows;
  }

  async findById(id: any) {
    const { rows } = await pool.query(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  async findByField(field: string, value: any) {
    const { rows } = await pool.query(
      `SELECT * FROM ${this.table} WHERE ${field} = $1`,
      [value]
    );
    return rows;
  }

  async create(data: Record<string, any>) {
    const sanitized = this.sanitizeData(data);
    this.validateRequired(sanitized);
    await this.checkDuplicates(sanitized);

    const keys = Object.keys(sanitized).join(", ");
    const values = Object.values(sanitized);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    const { rows } = await pool.query(
      `INSERT INTO ${this.table} (${keys}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    return rows[0];
  }

  async update(id: number, data: Record<string, any>) {
    const sanitized = this.sanitizeData(data);
    this.validateRequired(sanitized);
    await this.checkDuplicates(sanitized, id);

    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

    const { rows } = await pool.query(
      `UPDATE ${this.table} SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );

    return rows[0];
  }

  async delete(id: number) {
    const { rows } = await pool.query(
      `DELETE FROM ${this.table} WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    filters: Record<string, any> = {}
  ) {
    const offset = (page - 1) * limit;
    const values: any[] = [];
    let i = 1;

    let whereClause = "";
    if (Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters).map(([key, value]) => {
        values.push(value);
        return `${key} = $${i++}`;
      });
      whereClause = `WHERE ${conditions.join(" AND ")}`;
    }

    const query = `
      SELECT * FROM ${this.table}
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${i++} OFFSET $${i}
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  }

  async findByDateRange(
    dateField: string,
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `
      SELECT * FROM ${this.table}
      WHERE ${dateField} BETWEEN $1 AND $2
      ORDER BY ${dateField} DESC
      LIMIT $3 OFFSET $4
      `,
      [startDate, endDate, limit, offset]
    );

    return rows;
  }
}
