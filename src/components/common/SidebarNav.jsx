"use client";
import {
  hdlClickRadioBtn,
  hdlDrawer,
  hdlExpandedNavItems,
} from "@/lib/rtk/features/common/dashboardSlice";
import { Box, Drawer } from "@mui/material";
import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function SidebarNav({ children }) {
  const {
    drawer,
    drawerOpenWidth,
    drawerCloseWidth,
    clickRadioBtn,
    expandedNavItemsBackUp,
  } = useSelector((state) => state.dashboard);

  const asideElement = useRef();
  const dispatch = useDispatch();

  const hdlMouseEnter = () => {
    if (!clickRadioBtn && !drawer) {
      asideElement.current.classList.add("aside-hover");
      dispatch(hdlExpandedNavItems(expandedNavItemsBackUp));
    }
  };

  const hdlMouseLeave = () => {
    dispatch(hdlClickRadioBtn(false));
    asideElement.current.classList.remove("aside-hover");
    if (!drawer) {
      dispatch(hdlExpandedNavItems([]));
    }
  };

  return (
    <Box
      component="aside"
      ref={asideElement}
      onMouseEnter={hdlMouseEnter}
      onMouseLeave={hdlMouseLeave}
      className={drawer ? "active" : ""}
      sx={{
        ".MuiDrawer-paper": {
          width: `${drawerCloseWidth}px`,
        },
        "&.aside-hover,&.active": {
          ".MuiDrawer-paper": {
            width: `${drawerOpenWidth}px`,
          },
        },
      }}
    >
      <Drawer
        anchor="left"
        variant="permanent"
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        open={drawer}
        onClose={() => dispatch(hdlDrawer(false))}
        sx={{
          display: { xs: "none", lg: "block" },
        }}
      >
        {children}
      </Drawer>
      <Drawer
        anchor="left"
        variant="temporary"
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        open={drawer}
        onClose={() => dispatch(hdlDrawer(false))}
        sx={{
          display: { xs: "block", lg: "none" },
        }}
      >
        {children}
      </Drawer>
    </Box>
  );
}
