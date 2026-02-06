"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Button,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Groups as GroupsIcon,
  Add as AddIcon,
} from "@mui/icons-material";

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Content>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <BrandLoader />
        </Box>
      </Content>
    );
  }

  if (!data || data.error) {
    return (
      <Content>
        <Typography color="error">Failed to load dashboard data</Typography>
      </Content>
    );
  }

  const { stats, todayBookings, latestBookings, recentCustomers } = data;

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome to Raptor CRM - Your cleaning business command center
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/bookings/new")}
        >
          Book
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers?.toLocaleString() || 0}
            icon={<PeopleIcon />}
            color="#3b82f6"
            subtitle="Active accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="New Bookings Today"
            value={stats.newBookingsToday || 0}
            icon={<CalendarIcon />}
            color="#10b981"
            subtitle={`${stats.todayBookings || 0} scheduled today`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${(stats.monthlyRevenue || 0).toLocaleString()}`}
            icon={<MoneyIcon />}
            color="#f59e0b"
            subtitle={`${stats.monthlyBookings || 0} completed bookings`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Crews"
            value={stats.activeCrews || 0}
            icon={<GroupsIcon />}
            color="#8b5cf6"
            subtitle={`${stats.activeStaff || 0} staff members`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Latest Bookings
              </Typography>
              <TableContainer>
                <Table size="small">
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
                    {latestBookings?.length > 0 ? (
                      latestBookings.slice(0, 8).map((booking) => (
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
                                : "System"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {booking.customer
                                ? `${booking.customer.firstName} ${booking.customer.lastName}`
                                : "Unknown"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {booking.scheduledDate}
                              {booking.startTime && ` at ${booking.startTime.slice(0, 5)}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {booking.services?.length > 0
                                ? booking.services.map(s => s.service?.name).filter(Boolean).join(", ") || "-"
                                : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {booking.crew?.name || "-"}
                            </Typography>
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
                          No bookings yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Customers
              </Typography>
              {recentCustomers?.length > 0 ? (
                recentCustomers.map((customer) => (
                  <Box
                    key={customer.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      py: 1.5,
                      borderBottom: "1px solid #eee",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: "#3b82f6" }}>
                      {customer.firstName?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {customer.firstName} {customer.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.city || "No city"}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent customers
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Content>
  );
}
