// types/grn.ts
export interface GRNItem {
  id: number;
  product_variant_id: number;
  ordered_quantity: number;
  received_quantity: number;
  discrepancy: number;
  notes?: string;
  product_name?: string;
  product_code?: string;
  variant_name?: string;
  unit_cost?: number;
  line_total?: number;
}

export interface GRNSummary {
  total_items: number;
  total_ordered: number;
  total_received: number;
  total_discrepancy: number;
}

export interface GRN {
  id: number;
  purchase_order_id: number;
  code: string;
  received_date: string;
  received_by: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string;
  created_at: string;
  received_by_name?: string;
  purchase_order_code?: string;
  items: GRNItem[];
  summary: GRNSummary;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListGRNQuery {
  page?: string;
  limit?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  purchase_order_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
