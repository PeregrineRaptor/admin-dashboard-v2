"use client";

import { Box } from "@mui/material";
import Image from "next/image";

export default function BrandLoader({ size = 60 }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        "@keyframes pulse": {
          "0%, 100%": { opacity: 0.4, transform: "scale(0.95)" },
          "50%": { opacity: 1, transform: "scale(1)" },
        },
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <Image
        src="/images/peregrine-logo.png"
        alt="Loading..."
        width={size}
        height={size * 0.6}
        style={{ objectFit: "contain" }}
        priority
      />
    </Box>
  );
}
