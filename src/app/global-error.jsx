"use client";
import NextLink from "next/link";
import { Typography } from "@mui/material";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <Typography variant="h2">Something went wrong!</Typography>
        <NextLink href="/">Back To Home</NextLink>
      </body>
    </html>
  );
}
