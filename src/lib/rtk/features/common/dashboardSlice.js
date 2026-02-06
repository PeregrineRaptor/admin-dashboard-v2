import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  backDrop: false,
  drawer: false,
  drawerOpenWidth: 260,
  drawerCloseWidth: 60,
  clickRadioBtn: false,
  expandedNavItems: [],
  selectedNavItems: [],
  expandedNavItemsBackUp: [],
};

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    hdlBackDrop: (state, action) => {
      state.backDrop = action.payload;
    },
    hdlDrawer: (state, action) => {
      state.drawer = action.payload;
    },
    hdlClickRadioBtn: (state, action) => {
      state.clickRadioBtn = action.payload;
    },
    hdlExpandedNavItems: (state, action) => {
      state.expandedNavItems = action.payload;
    },
    hdlSelectedNavItems: (state, action) => {
      state.selectedNavItems = action.payload;
    },
    hdlExpandedNavItemsBackUp: (state, action) => {
      state.expandedNavItemsBackUp = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  hdlBackDrop,
  hdlDrawer,
  hdlClickRadioBtn,
  hdlExpandedNavItems,
  hdlSelectedNavItems,
  hdlExpandedNavItemsBackUp,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
