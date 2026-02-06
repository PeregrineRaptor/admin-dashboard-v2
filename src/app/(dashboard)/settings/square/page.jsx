"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import Content from "@/components/common/Content";

export default function SquareSettingsPage() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [bookingPreview, setBookingPreview] = useState(null);
  const [syncingBookings, setSyncingBookings] = useState(false);
  const [bookingSyncResult, setBookingSyncResult] = useState(null);
  const [pricingStats, setPricingStats] = useState(null);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [priceSyncResult, setPriceSyncResult] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [syncingAppointments, setSyncingAppointments] = useState(false);
  const [appointmentSyncResult, setAppointmentSyncResult] = useState(null);
  const [dateFixStats, setDateFixStats] = useState(null);
  const [fixingDates, setFixingDates] = useState(false);
  const [dateFixResult, setDateFixResult] = useState(null);

  useEffect(() => {
    fetchPreview();
    fetchBookingPreview();
    fetchPricingStats();
    fetchAppointmentStats();
    fetchDateFixStats();
  }, []);

  const fetchPricingStats = async () => {
    try {
      const response = await fetch("/api/square/sync-prices");
      const data = await response.json();
      setPricingStats(data);
    } catch (err) {
      console.error("Failed to fetch pricing stats:", err);
    }
  };

  const handleSyncPrices = async () => {
    try {
      setSyncingPrices(true);
      setPriceSyncResult(null);
      const response = await fetch("/api/square/sync-prices", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setPriceSyncResult(data);
        fetchPricingStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to sync prices from appointments");
    } finally {
      setSyncingPrices(false);
    }
  };

  const fetchAppointmentStats = async () => {
    try {
      const response = await fetch("/api/square/sync-appointments");
      const data = await response.json();
      setAppointmentStats(data);
    } catch (err) {
      console.error("Failed to fetch appointment stats:", err);
    }
  };

  const handleSyncAppointments = async () => {
    try {
      setSyncingAppointments(true);
      setAppointmentSyncResult(null);
      const response = await fetch("/api/square/sync-appointments", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setAppointmentSyncResult(data);
        fetchAppointmentStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to sync appointment services from Square");
    } finally {
      setSyncingAppointments(false);
    }
  };

  const fetchDateFixStats = async () => {
    try {
      const response = await fetch("/api/square/fix-booking-dates");
      const data = await response.json();
      if (!data.error) {
        setDateFixStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch date fix stats:", err);
    }
  };

  const handleFixDates = async () => {
    try {
      setFixingDates(true);
      setDateFixResult(null);
      const response = await fetch("/api/square/fix-booking-dates", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setDateFixResult(data);
        fetchDateFixStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fix booking dates");
    } finally {
      setFixingDates(false);
    }
  };

  const fetchBookingPreview = async () => {
    try {
      const response = await fetch("/api/square/sync-bookings");
      const data = await response.json();
      if (data.success) {
        setBookingPreview(data);
      }
    } catch (err) {
      console.error("Failed to preview bookings:", err);
    }
  };

  const handleSyncBookings = async () => {
    try {
      setSyncingBookings(true);
      setBookingSyncResult(null);
      const response = await fetch("/api/square/sync-bookings", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setBookingSyncResult(data);
        fetchBookingPreview();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to sync bookings with Square");
    } finally {
      setSyncingBookings(false);
    }
  };

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/square/sync");
      const data = await response.json();
      if (data.success) {
        setPreview(data.preview);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to Square API");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const response = await fetch("/api/square/sync", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setSyncResult(data);
        fetchPreview();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to sync with Square");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <BrandLoader />
        </Box>
      </Content>
    );
  }

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Square Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sync your team members and crews from Square
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
          sx={{ borderRadius: 2 }}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {syncResult && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          icon={<CheckCircleIcon />}
          onClose={() => setSyncResult(null)}
        >
          Sync completed! Staff: {syncResult.results.staff.created} created, {syncResult.results.staff.updated} updated.
          Crews: {syncResult.results.crews.created} created, {syncResult.results.crews.updated} updated.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Staff Members
              </Typography>
              <Chip label={preview?.staff?.length || 0} size="small" color="primary" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Individual team members from Square
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview?.staff?.map((member) => (
                    <TableRow key={member.squareId}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {member.name}
                          {member.isOwner && (
                            <Chip label="Owner" size="small" color="warning" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={member.status}
                          size="small"
                          color={member.status === "ACTIVE" ? "success" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <GroupIcon color="secondary" />
              <Typography variant="h6" fontWeight="bold">
                Crews / Teams
              </Typography>
              <Chip label={preview?.crews?.length || 0} size="small" color="secondary" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crew and squad assignments from Square
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview?.crews?.map((crew) => (
                    <TableRow key={crew.squareId}>
                      <TableCell>{crew.name}</TableCell>
                      <TableCell>{crew.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={crew.status}
                          size="small"
                          color={crew.status === "ACTIVE" ? "success" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 2, mt: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Bookings Sync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sync appointments from Square to your CRM
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={syncingBookings ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleSyncBookings}
              disabled={syncingBookings}
              sx={{ borderRadius: 2 }}
            >
              {syncingBookings ? "Syncing..." : "Sync Bookings"}
            </Button>
          </Box>
          {bookingSyncResult && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setBookingSyncResult(null)}>
              Bookings synced! {bookingSyncResult.results.created} created, {bookingSyncResult.results.updated} updated.
            </Alert>
          )}
          {bookingPreview && (
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Square Bookings</Typography>
                <Typography variant="h5" fontWeight="bold">{bookingPreview.squareBookingsCount || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Database Bookings</Typography>
                <Typography variant="h5" fontWeight="bold">{bookingPreview.databaseBookingsCount || 0}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mt: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Property Pricing Sync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Extract service prices from appointments and apply to customer properties
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={syncingPrices ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleSyncPrices}
              disabled={syncingPrices}
              sx={{ borderRadius: 2 }}
            >
              {syncingPrices ? "Syncing..." : "Sync Prices"}
            </Button>
          </Box>
          {priceSyncResult && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPriceSyncResult(null)}>
              Pricing synced! {priceSyncResult.processed} bookings processed, {priceSyncResult.updated} property prices updated.
            </Alert>
          )}
          {pricingStats && (
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Properties with Pricing</Typography>
                <Typography variant="h5" fontWeight="bold">{pricingStats.propertiesWithPricing || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Properties</Typography>
                <Typography variant="h5" fontWeight="bold">{pricingStats.totalProperties || 0}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mt: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Appointment Services Sync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Link service details from Square appointments to your bookings (fixes missing services like Housekeeping)
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={syncingAppointments ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleSyncAppointments}
              disabled={syncingAppointments}
              sx={{ borderRadius: 2 }}
            >
              {syncingAppointments ? "Syncing..." : "Sync Services"}
            </Button>
          </Box>
          {appointmentSyncResult && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAppointmentSyncResult(null)}>
              Services synced! Fetched {appointmentSyncResult.squareBookingsFetched} Square bookings. 
              Created {appointmentSyncResult.newBookings || 0} new bookings, 
              linked {appointmentSyncResult.linkedServices} services.
            </Alert>
          )}
          {appointmentStats && (
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">2026 Bookings</Typography>
                <Typography variant="h5" fontWeight="bold">{appointmentStats.bookings2026 || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">With Services</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">{appointmentStats.bookingsWithServices || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Missing Services</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{appointmentStats.bookingsMissingServices || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Bookings</Typography>
                <Typography variant="h5" fontWeight="bold">{appointmentStats.totalBookings || 0}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mt: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Fix Booking Creation Dates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update booking creation dates to match Square&apos;s original booking dates
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="warning"
              startIcon={fixingDates ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleFixDates}
              disabled={fixingDates}
              sx={{ borderRadius: 2 }}
            >
              {fixingDates ? "Fixing..." : "Fix Dates"}
            </Button>
          </Box>
          {dateFixResult && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDateFixResult(null)}>
              Fixed {dateFixResult.updated} booking dates out of {dateFixResult.totalNeedingFix} that needed fixing.
              {dateFixResult.errors > 0 && ` (${dateFixResult.errors} errors)`}
            </Alert>
          )}
          {dateFixStats && (
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Bookings with Square ID</Typography>
                <Typography variant="h5" fontWeight="bold">{dateFixStats.totalBookingsWithSquareId || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Need Date Fix</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{dateFixStats.bookingsWithRecentCreatedAt || 0}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            How Sync Works
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The sync automatically categorizes your Square team members:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Staff:</strong> Individual people (names without &quot;Crew&quot;, &quot;Squad&quot;, or &quot;Team&quot;)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Crews:</strong> Team names containing &quot;Crew&quot;, &quot;Squad&quot;, or &quot;Team&quot;
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Content>
  );
}
