"use client";
import { Box, Container, Grid } from "@mui/material";
import { useSelector } from "react-redux";

export default function Content({ children }) {
  const { drawer, drawerOpenWidth, drawerCloseWidth } = useSelector(
    (state) => state.dashboard
  );

  return (
    <Box
      sx={{
        ml: {
          lg: drawer ? `${drawerOpenWidth}px` : `${drawerCloseWidth}px`,
        },
        minHeight: "100vh",
        transition: "margin linear 0.3s",
      }}
    >
      <Container maxWidth="false">
        <Grid container columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          <Grid item xs={12} sx={{ pt: "30px" }}>
            {children}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
