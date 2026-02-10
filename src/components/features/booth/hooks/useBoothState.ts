import { useReducer } from "react";
import { Action, State } from "../types";

const initialState: State = {
  step: "idle",
  transaction: {
    total_price: 0,
    payment_status: "pending",
    quantity: 1,
  },
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_PAYMENT_METHOD":
      return {
        ...state,
        transaction: { ...state.transaction, payment_method: action.method },
      };
    case "SET_TEMPLATE":
      return {
        ...state,
        transaction: { ...state.transaction, template_id: action.templateId },
      };
    case "SET_QUANTITY":
      return {
        ...state,
        transaction: { ...state.transaction, quantity: action.quantity },
      };
    case "SET_TOTAL_PRICE":
      return {
        ...state,
        transaction: { ...state.transaction, total_price: action.total },
      };
    case "SET_PAYMENT_STATUS":
      return {
        ...state,
        transaction: { ...state.transaction, payment_status: action.status },
      };
    case "SET_TRANSACTION_ID":
      return {
        ...state,
        transaction: { ...state.transaction, id: action.id },
      };
    case "SET_PHOTO_URL":
      return {
        ...state,
        transaction: { ...state.transaction, photo_url: action.url },
      };
    case "SET_EMAIL":
      return {
        ...state,
        transaction: { ...state.transaction, email: action.email },
      };
    case "SET_PACKAGE_TYPE":
      return {
        ...state,
        transaction: { ...state.transaction, package_type: action.packageType },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

export function useBoothState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}
