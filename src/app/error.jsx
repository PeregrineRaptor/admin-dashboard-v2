"use client";
import React from "react";
import { Container, Button, Typography, Box } from "@mui/material";
import NextLink from "next/link";

export default function Custom404() {
  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          padding: {
            xs: "30px 0",
            sm: "40px 0",
            md: "60px 0",
            lg: "80px 0",
          },
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h2" sx={{ mb: "10px" }}>
          Uh-0h! Page not found
        </Typography>
        <Typography
          sx={{
            marginLeft: { md: "auto" },
            marginRight: { md: "auto" },
            textAlign: "center",
          }}
        >
          Sorry, we could’t find this page. But don’t worry you can find plenty
          others things on{" "}
          <Typography component="span" sx={{ color: "primary.main" }}>
            home page{" "}
          </Typography>
        </Typography>
        <NextLink href="/">
          <Button
            size="small"
            component="span"
            variant="outlined"
            sx={{ mt: "12px" }}
          >
            Back to home
          </Button>
        </NextLink>
        <Box
          sx={{
            fontSize: {
              xs: "10rem",
              sm: "15rem",
              md: "20rem",
              lg: "25rem",
              xl: "32rem",
            },
            fontWeight: "bold",
            lineHeight: 1,
            mt: "30px",
          }}
        >
          404
        </Box>
      </Box>
    </Container>
  );
}
