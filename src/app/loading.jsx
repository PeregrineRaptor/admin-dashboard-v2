"use client";

import React from "react";
import NextImage from "next/image";
import Box from "@mui/material/Box";

export default function Loading() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        textAlign: "center",
        bgcolor: "background.default",
        "@keyframes pulse": {
          "0%, 100%": { opacity: 0.4, transform: "scale(0.95)" },
          "50%": { opacity: 1, transform: "scale(1)" },
        },
      }}
    >
      <Box
        sx={{
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        <NextImage
          src="/images/peregrine-logo.png"
          alt="Loading..."
          width={120}
          height={72}
          priority
          style={{ objectFit: "contain" }}
        />
      </Box>
    </Box>
  );
}
