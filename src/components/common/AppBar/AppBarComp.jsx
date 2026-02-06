"use client";
import { hdlDrawer } from "@/lib/rtk/features/common/dashboardSlice";
import { AppBar, Box, Container, Grid, IconButton, Tooltip } from "@mui/material";
import { GiHamburgerMenu } from "react-icons/gi";
import { useDispatch, useSelector } from "react-redux";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useThemeMode } from "@/utility/ThemeRegistry/ThemeContext";
import UserPanel from "./UserPanel";

export default function AppBarComp() {
  const { drawer, drawerOpenWidth, drawerCloseWidth } = useSelector(
    (state) => state.dashboard
  );
  const dispatch = useDispatch();
  const { mode, toggleTheme } = useThemeMode();
  
  return (
    <Container
      maxWidth="false"
      sx={{ position: "sticky", top: "0px", bgcolor: "background.default", pt: "20px" }}
    >
      <Grid container columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item xs={12}>
          <AppBar
            position="sticky"
            top="20px"
            color="transparent"
            sx={{
              width: "auto",
              ml: {
                lg: drawer ? `${drawerOpenWidth}px` : `${drawerCloseWidth}px`,
              },
              transition: "margin linear 0.3s",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1,
                px: 3,
              }}
            >
              <Box sx={{ svg: { display: { lg: "none" }, cursor: "pointer" } }}>
                <GiHamburgerMenu
                  onClick={() => {
                    dispatch(hdlDrawer(true));
                  }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
                  <IconButton onClick={toggleTheme} color="inherit">
                    {mode === "light" ? <MdDarkMode size={22} /> : <MdLightMode size={22} />}
                  </IconButton>
                </Tooltip>
                <UserPanel />
              </Box>
            </Box>
          </AppBar>
        </Grid>
      </Grid>
    </Container>
  );
}
