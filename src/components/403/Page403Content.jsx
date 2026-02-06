"use client";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function Page403Content() {
  const router = useRouter();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
    >
      <LockOutlinedIcon sx={{ fontSize: 64, color: "text.secondary" }} />
      <Typography variant="h4" fontWeight={600}>
        Access Denied
      </Typography>
      <Typography variant="body1" color="text.secondary">
        You do not have permission to view this page.
      </Typography>
      <Button variant="contained" onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </Button>
    </Box>
  );
}
