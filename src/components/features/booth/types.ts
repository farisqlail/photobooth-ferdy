export type Step =
  | "idle"
  | "payment"
  | "noncash"
  | "template"
  | "quantity"
  | "qris"
  | "session"
  | "filter"
  | "delivery"
  | "finish";

export type TransactionData = {
  id?: string;
  total_price: number;
  payment_method?: string;
  payment_status: "pending" | "paid" | "canceled";
  template_id?: string;
  photo_url?: string;
  quantity: number;
  email?: string;
};

export type State = {
  step: Step;
  transaction: TransactionData;
};

export type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_PAYMENT_METHOD"; method: string }
  | { type: "SET_TEMPLATE"; templateId: string }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "SET_TOTAL_PRICE"; total: number }
  | { type: "SET_PAYMENT_STATUS"; status: TransactionData["payment_status"] }
  | { type: "SET_TRANSACTION_ID"; id: string }
  | { type: "SET_PHOTO_URL"; url: string }
  | { type: "SET_EMAIL"; email: string }
  | { type: "RESET" };

export type PaymentMethod = {
  id: string;
  name: string;
  type: "cash" | "non_cash";
  is_active: boolean;
};

export type TemplateOption = {
  id: string;
  name: string;
  file_path: string;
  url: string;
  slots?: number;
  photo_x?: number;
  photo_y?: number;
  photo_width?: number;
  photo_height?: number;
  slots_config?: { id: string; x: number; y: number; width: number; height: number }[];
};

export type FilterOption = {
  id: string;
  label: string;
  value: string;
};
