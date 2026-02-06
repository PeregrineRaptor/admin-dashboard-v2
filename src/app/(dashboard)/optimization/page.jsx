"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  Tooltip,
  CircularProgress,
  TextField,
  Divider,
} from "@mui/material";
import {
  Map as MapIcon,
  Route as RouteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  CalendarMonth,
  AccessTime,
  SwapHoriz as SwapIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";

export default function OptimizationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [daysAhead, setDaysAhead] = useState(14);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchData();
    if (selectedDate) {
      setTabValue(2);
    }
  }, [daysAhead, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/optimization?days=${daysAhead}`;
      if (selectedDate) {
        url = `/api/optimization?startDate=${selectedDate}&endDate=${selectedDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch optimization data:", error);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount || 0);
  };

  const formatHours = (hours) => {
    if (!hours) return "0h";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getUtilizationColor = (percent) => {
    if (percent >= 100) return "error";
    if (percent >= 90) return "warning";
    if (percent >= 70) return "info";
    return "success";
  };

  const displayedDays = useMemo(() => {
    if (!data) return [];
    if (tabValue === 0) return data.overCapacityDays || [];
    if (tabValue === 1) return data.maxedDays || [];
    return data.crewDays || [];
  }, [data, tabValue]);

  const handleViewMap = (crewDay) => {
    setSelectedDay(crewDay);
    setMapOpen(true);
  };

  const handleOptimize = async (crewDay) => {
    const bookingsWithCoords = crewDay.bookings.filter(b => b.latitude && b.longitude);
    const bookingsWithoutCoords = crewDay.bookings.filter(b => !b.latitude || !b.longitude);
    
    if (bookingsWithCoords.length < 2) {
      alert("Need at least 2 bookings with coordinates to optimize route.");
      return;
    }
    
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + 
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    
    const nearestNeighbor = (points) => {
      const result = [];
      const remaining = [...points];
      let current = remaining.shift();
      result.push(current);
      
      while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const dist = haversineDistance(
            current.latitude, current.longitude,
            remaining[i].latitude, remaining[i].longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
        current = remaining.splice(nearestIdx, 1)[0];
        result.push(current);
      }
      return result;
    };
    
    const optimizedRoute = nearestNeighbor(bookingsWithCoords);
    
    try {
      const updates = [];
      for (let i = 0; i < optimizedRoute.length; i++) {
        updates.push(
          fetch(`/api/bookings/${optimizedRoute[i].id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routeOrder: i + 1, syncToSquare: false }),
          })
        );
      }
      for (let i = 0; i < bookingsWithoutCoords.length; i++) {
        updates.push(
          fetch(`/api/bookings/${bookingsWithoutCoords[i].id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routeOrder: optimizedRoute.length + i + 1, syncToSquare: false }),
          })
        );
      }
      await Promise.all(updates);
      
      const msg = bookingsWithoutCoords.length > 0 
        ? `Route optimized for ${optimizedRoute.length} bookings. ${bookingsWithoutCoords.length} booking(s) without coordinates placed at end.`
        : "Route order optimized!";
      alert(msg);
      fetchData();
    } catch (error) {
      console.error("Failed to optimize:", error);
      alert("Failed to update route order.");
    }
  };

  const getAvailableCrews = (date) => {
    return data?.crewAvailabilityByDate?.[date] || [];
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          Route Optimization
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {!selectedDate && [7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={daysAhead === d ? "contained" : "outlined"}
              size="small"
              onClick={() => setDaysAhead(d)}
            >
              {d} Days
            </Button>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <TextField
            type="date"
            label="Jump to Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          {selectedDate && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedDate("")}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {data?.summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h3" color="primary">{data.summary.totalDays}</Typography>
                <Typography color="text.secondary">Crew Days Scheduled</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h3" color="warning.main">{data.summary.maxedCount}</Typography>
                <Typography color="text.secondary">Near/At Max Capacity</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: data.summary.overCapacityCount > 0 ? "error.dark" : undefined }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h3" color={data.summary.overCapacityCount > 0 ? "white" : "error.main"}>
                  {data.summary.overCapacityCount}
                </Typography>
                <Typography color={data.summary.overCapacityCount > 0 ? "white" : "text.secondary"}>
                  Over Capacity - Needs Action
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab 
            label={`Over Capacity (${data?.overCapacityDays?.length || 0})`} 
            icon={<ErrorIcon color="error" />} 
            iconPosition="start" 
          />
          <Tab 
            label={`Ready to Optimize (${data?.maxedDays?.length || 0})`} 
            icon={<WarningIcon color="warning" />} 
            iconPosition="start" 
          />
          <Tab 
            label={`All Days (${data?.crewDays?.length || 0})`} 
            icon={<CalendarMonth />} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>

      {displayedDays.length === 0 ? (
        <Alert severity="info">
          {tabValue === 0 
            ? "No crews over capacity. Great!"
            : tabValue === 1
            ? "No crews at max capacity in the selected period."
            : "No scheduled bookings in the selected period."}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {displayedDays.map((crewDay) => {
            const availableCrews = getAvailableCrews(crewDay.date).filter(c => c.crewId !== crewDay.crewId);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={`${crewDay.crewId}-${crewDay.date}`}>
                <Card 
                  sx={{ 
                    borderLeft: 4, 
                    borderColor: crewDay.isOverCapacity ? "error.main" : crewDay.crewColor || "primary.main",
                    position: "relative",
                    bgcolor: crewDay.isOverCapacity ? "error.50" : undefined,
                  }}
                >
                  {crewDay.isOverCapacity && (
                    <Box sx={{ 
                      position: "absolute", 
                      top: 8, 
                      right: 8, 
                      bgcolor: "error.main", 
                      color: "white", 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}>
                      <ErrorIcon fontSize="small" />
                      <Typography variant="caption" fontWeight={600}>
                        Over by {formatCurrency(crewDay.overAmount)}
                      </Typography>
                    </Box>
                  )}
                  
                  <CardContent sx={{ pt: crewDay.isOverCapacity ? 5 : 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {crewDay.crewName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(crewDay.date)}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`${crewDay.utilizationPercent}%`}
                        color={getUtilizationColor(crewDay.utilizationPercent)}
                        icon={crewDay.isOverCapacity ? <ErrorIcon /> : crewDay.isMaxed ? <CheckIcon /> : undefined}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2">Production</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(crewDay.totalProduction)} / {formatCurrency(crewDay.maxProduction)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(crewDay.utilizationPercent, 100)}
                        color={getUtilizationColor(crewDay.utilizationPercent)}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {crewDay.bookings.length} booking{crewDay.bookings.length !== 1 ? "s" : ""}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          ~{formatHours(crewDay.totalEstimatedHours)} total
                        </Typography>
                      </Box>
                    </Box>

                    {crewDay.isOverCapacity && availableCrews.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                          Move appointments to:
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {availableCrews.slice(0, 3).map(crew => (
                            <Tooltip 
                              key={crew.crewId} 
                              title={`Available: ${formatCurrency(crew.remainingCapacity)} (${100 - crew.utilizationPercent}% free)`}
                            >
                              <Chip
                                size="small"
                                label={crew.crewName}
                                sx={{ bgcolor: crew.crewColor, color: "white", fontSize: "0.7rem" }}
                                icon={<SwapIcon sx={{ color: "white !important" }} />}
                              />
                            </Tooltip>
                          ))}
                          {availableCrews.length > 3 && (
                            <Chip size="small" label={`+${availableCrews.length - 3} more`} variant="outlined" />
                          )}
                        </Box>
                      </Alert>
                    )}

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MapIcon />}
                        onClick={() => handleViewMap(crewDay)}
                        disabled={!crewDay.bookings.some(b => b.latitude && b.longitude)}
                      >
                        View Map
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<RouteIcon />}
                        onClick={() => handleOptimize(crewDay)}
                        disabled={crewDay.bookings.filter(b => b.latitude && b.longitude).length < 2}
                      >
                        Optimize
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={mapOpen} onClose={() => setMapOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6">
              {selectedDay?.crewName} - {selectedDay && formatDate(selectedDay.date)}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedDay?.bookings.length} properties
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ~{formatHours(selectedDay?.totalEstimatedHours)} total
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setMapOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedDay && (
            <Box>
              <Box sx={{ mb: 2, height: 400, bgcolor: "grey.100", borderRadius: 2, overflow: "hidden" }}>
                <MapEmbed bookings={selectedDay.bookings} crewColor={selectedDay.crewColor} />
              </Box>
              
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Route Order (Est. {formatHours(selectedDay.totalEstimatedHours)} total)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={50}>#</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Est. Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedDay.bookings
                    .sort((a, b) => (a.routeOrder || 999) - (b.routeOrder || 999))
                    .map((booking, idx) => (
                      <TableRow key={booking.id}>
                        <TableCell>{booking.routeOrder || idx + 1}</TableCell>
                        <TableCell>{booking.customerName}</TableCell>
                        <TableCell>{booking.address}</TableCell>
                        <TableCell>{booking.city}</TableCell>
                        <TableCell align="right">{formatCurrency(booking.subtotal)}</TableCell>
                        <TableCell align="right">{formatHours(booking.estimatedHours)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<RouteIcon />}
            onClick={() => {
              handleOptimize(selectedDay);
              setMapOpen(false);
            }}
            disabled={!selectedDay || selectedDay.bookings.filter(b => b.latitude && b.longitude).length < 2}
          >
            Optimize Route
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MapEmbed({ bookings, crewColor }) {
  const validBookings = bookings.filter(b => b.latitude && b.longitude);
  
  if (validBookings.length === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography color="text.secondary">No coordinates available for map</Typography>
      </Box>
    );
  }

  const center = {
    lat: validBookings.reduce((sum, b) => sum + b.latitude, 0) / validBookings.length,
    lng: validBookings.reduce((sum, b) => sum + b.longitude, 0) / validBookings.length,
  };

  const markers = validBookings.map((b, idx) => 
    `markers=color:red%7Clabel:${idx + 1}%7C${b.latitude},${b.longitude}`
  ).join("&");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  if (!apiKey) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 2 }}>
        <Typography color="text.secondary">Google Maps API key not configured</Typography>
        <Typography variant="body2" color="text.secondary">
          Properties: {validBookings.map((b, i) => `${i + 1}. ${b.address}`).join(" | ")}
        </Typography>
      </Box>
    );
  }

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=11&size=800x400&maptype=roadmap&${markers}&key=${apiKey}`;

  return (
    <Box
      component="img"
      src={mapUrl}
      alt="Route Map"
      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
