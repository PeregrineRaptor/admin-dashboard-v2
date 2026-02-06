"use client";
import { Provider } from "react-redux";
import { store } from "./store";

export default function RtkProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
