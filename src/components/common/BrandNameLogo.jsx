"use client";
import {
  hdlClickRadioBtn,
  hdlDrawer,
  hdlExpandedNavItems,
  hdlExpandedNavItemsBackUp,
  hdlSelectedNavItems,
} from "@/lib/rtk/features/common/dashboardSlice";
import { Box } from "@mui/material";
import NextImage from "next/image";
import NextLink from "next/link";
import {
  MdOutlineClose,
  MdOutlineRadioButtonChecked,
  MdOutlineRadioButtonUnchecked,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";

export default function BrandNameLogo() {
  const { drawer } = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  const hdlCloseDrawer = () => {
    dispatch(hdlDrawer(false));
    dispatch(hdlClickRadioBtn(true));
    dispatch(hdlExpandedNavItems([]));
  };
  const hdlClickLogo = () => {
    dispatch(hdlExpandedNavItems([]));
    dispatch(hdlSelectedNavItems([]));
    dispatch(hdlExpandedNavItemsBackUp([]));
  };
  return (
    <Box
      sx={{
        ".lg-icon": {
          display: { xs: "none", lg: "block" },
        },
        ".xs-icon": {
          display: { lg: "none" },
        },
      }}
      className="logo-name"
    >
      <NextLink href="/" onClick={hdlClickLogo}>
        <Box
          component="figure"
          sx={{ maxWidth: "42px", pl: "1px", flexShrink: "0" }}
        >
          <NextImage
            src="/images/logo/raptor-logo.png"
            alt="walton-logo"
            width="211"
            height="194"
          />
        </Box>
        <Box component="figure" sx={{ maxWidth: "130px", flexShrink: "0" }}>
          <NextImage
            src="/images/logo/raptor-logo-text.png"
            alt="walton-logo-text"
            width="907"
            height="199"
          />
        </Box>
      </NextLink>
      {drawer ? (
        <>
          <MdOutlineRadioButtonChecked
            className="lg-icon"
            onClick={() => {
              hdlCloseDrawer();
            }}
          />
          <MdOutlineClose
            className="xs-icon"
            onClick={() => {
              hdlCloseDrawer();
            }}
          />
        </>
      ) : (
        <MdOutlineRadioButtonUnchecked
          className="lg-icon"
          onClick={() => {
            dispatch(hdlDrawer(true));
          }}
        />
      )}
    </Box>
  );
}
