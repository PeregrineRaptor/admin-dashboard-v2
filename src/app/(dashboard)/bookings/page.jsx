"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Search as SearchIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
} from "@mui/icons-material";
import BrandLoader from "@/components/BrandLoader";

function getStatusColor(status) {
  const colors = {
    pending: "warning",
    confirmed: "info",
    in_progress: "primary",
    completed: "success",
    cancelled: "error",
  };
  return colors[status] || "default";
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // asc = newest first (button swapped)

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "25", sortOrder });
      if (search) params.append("search", search);

      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchBookings();
    }, 300);
    return () => clearTimeout(debounce);
  }, [page, search, sortOrder]);

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Bookings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total.toLocaleString()} total bookings
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by customer name, email, or address..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={(e, val) => { if (val) { setSortOrder(val); setPage(1); } }}
          size="small"
        >
          <ToggleButton value="desc" title="Oldest bookings first">
            <AscIcon fontSize="small" sx={{ mr: 0.5 }} /> Oldest
          </ToggleButton>
          <ToggleButton value="asc" title="Newest bookings first">
            <DescIcon fontSize="small" sx={{ mr: 0.5 }} /> Newest
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <BrandLoader />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Created By</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Booked For</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Crew</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <TableRow 
                      key={booking.id} 
                      hover 
                      sx={{ cursor: "pointer" }}
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {booking.createdByUser
                            ? `${booking.createdByUser.firstName} ${booking.createdByUser.lastName}`
                            : "Square"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {booking.customer
                            ? `${booking.customer.firstName} ${booking.customer.lastName}`
                            : "Unknown"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.address || booking.customer?.city || ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {booking.scheduledDate ? new Date(booking.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.startTime || "All Day"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {booking.services && booking.services.length > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {booking.services.slice(0, 2).map((s, i) => (
                              <Typography key={i} variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                {s.service?.name || s.variation || "Service"}
                              </Typography>
                            ))}
                            {booking.services.length > 2 && (
                              <Typography variant="caption" color="text.secondary">
                                +{booking.services.length - 2} more
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.crew ? (
                          <Chip
                            label={booking.crew.name}
                            size="small"
                            sx={{
                              bgcolor: booking.crew.color,
                              color: "#fff",
                            }}
                          />
                        ) : (
                          <Chip label="Unassigned" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.status}
                          size="small"
                          color={getStatusColor(booking.status)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No bookings found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, p) => setPage(p)}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Content>
  );
}
