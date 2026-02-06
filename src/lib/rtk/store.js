import { configureStore } from "@reduxjs/toolkit";
import dashboardReducer from "./features/common/dashboardSlice";

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
  },
});
