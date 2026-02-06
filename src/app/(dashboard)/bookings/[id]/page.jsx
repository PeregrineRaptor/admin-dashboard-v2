"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Divider,
  Avatar,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Snackbar,
  Alert,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  ArrowBack as BackIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "#FFA726" },
  { value: "confirmed", label: "Confirmed", color: "#42A5F5" },
  { value: "in_progress", label: "In Progress", color: "#7E57C2" },
  { value: "completed", label: "Completed", color: "#66BB6A" },
  { value: "cancelled", label: "Cancelled", color: "#EF5350" },
];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) + " " + 
         date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crews, setCrews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [servicePrices, setServicePrices] = useState({});
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetch("/api/crews").then(res => res.json()).then(setCrews).catch(console.error);
    fetch("/api/services").then(res => res.json()).then(setAvailableServices).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${params.id}`);
        const data = await res.json();
        if (!data.error) {
          setBooking(data);
          setNoteText(data.noteFromBusiness || "");
          const prices = {};
          data.services?.forEach(s => {
            prices[s.id] = parseFloat(s.price || 0);
          });
          setServicePrices(prices);
          if (data.customer?.hasSeasonPass) {
            setDiscountPercent(25);
          }
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      }
      setLoading(false);
    };
    if (params.id) fetchBooking();
  }, [params.id]);

  const handleCancelBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setBooking({ ...booking, status: "cancelled" });
        setCancelDialogOpen(false);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await fetch(`/api/bookings/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteFromBusiness: noteText }),
      });
      setBooking({ ...booking, noteFromBusiness: noteText });
      setEditingNote(false);
    } catch (error) {
      console.error("Error saving note:", error);
    }
    setSaving(false);
  };

  const handleUpdateServicePrice = async (serviceId, newPrice) => {
    setServicePrices({ ...servicePrices, [serviceId]: parseFloat(newPrice) });
    setEditingServiceId(null);
    try {
      await fetch(`/api/bookings/${params.id}/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parseFloat(newPrice) }),
      });
    } catch (error) {
      console.error("Error updating service price:", error);
    }
  };

  const handleCrewChange = async (newCrewId) => {
    try {
      await fetch(`/api/bookings/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId: newCrewId || null }),
      });
      const selectedCrew = crews.find(c => c.id === newCrewId);
      setBooking({ ...booking, crewId: newCrewId, crew: selectedCrew || null });
    } catch (error) {
      console.error("Error updating crew:", error);
    }
  };

  const handleGetDirections = () => {
    if (booking?.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}`, "_blank");
    }
  };

  const handleStartJob = async () => {
    try {
      await fetch(`/api/bookings/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      setBooking({ ...booking, status: "in_progress" });
    } catch (error) {
      console.error("Error starting job:", error);
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceId || !newServicePrice) return;
    try {
      const res = await fetch(`/api/bookings/${params.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          serviceId: parseInt(selectedServiceId), 
          price: parseFloat(newServicePrice) 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const service = availableServices.find(s => s.id === parseInt(selectedServiceId));
        setBooking({
          ...booking,
          services: [...(booking.services || []), { ...data, service }],
        });
        setServicePrices({ ...servicePrices, [data.id]: parseFloat(newServicePrice) });
        setAddServiceDialogOpen(false);
        setSelectedServiceId("");
        setNewServicePrice("");
        setSnackbar({ open: true, message: "Service added successfully", severity: "success" });
      } else {
        setSnackbar({ open: true, message: data.error || "Failed to add service", severity: "error" });
      }
    } catch (error) {
      console.error("Error adding service:", error);
      setSnackbar({ open: true, message: "Failed to add service", severity: "error" });
    }
  };

  const handleRemoveService = async (bookingServiceId) => {
    try {
      const res = await fetch(`/api/bookings/${params.id}/services/${bookingServiceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBooking({
          ...booking,
          services: booking.services.filter(s => s.id !== bookingServiceId),
        });
        const newPrices = { ...servicePrices };
        delete newPrices[bookingServiceId];
        setServicePrices(newPrices);
        setSnackbar({ open: true, message: "Service removed", severity: "success" });
      } else {
        const data = await res.json();
        setSnackbar({ open: true, message: data.error || "Failed to remove service", severity: "error" });
      }
    } catch (error) {
      console.error("Error removing service:", error);
      setSnackbar({ open: true, message: "Failed to remove service", severity: "error" });
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

  if (!booking) {
    return (
      <Content>
        <Typography color="error">Booking not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Content>
    );
  }

  const customer = booking.customer;
  const crew = booking.crew || crews.find(c => c.id === booking.crewId);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapAddress = booking.address || (customer ? `${customer.streetAddress1}, ${customer.city}, ${customer.state}` : "");

  const calculateSubtotal = () => {
    if (booking.services?.length > 0) {
      return booking.services.reduce((sum, s) => sum + (servicePrices[s.id] || parseFloat(s.price || 0)), 0);
    }
    return parseFloat(booking.totalAmount || 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxRate = 0.13;
  const taxAmount = afterDiscount * taxRate;
  const total = afterDiscount + taxAmount;

  return (
    <Content>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h6" fontWeight="bold">Booking Details</Typography>
          <Typography variant="caption" color="text.secondary">Booking › Booking Details</Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 2, mb: 2, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: "grey.300", color: "text.primary", fontWeight: "bold", fontSize: "1.25rem" }}>
            {customer?.firstName?.[0]}{customer?.lastName?.[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" fontWeight="bold">
              {customer?.firstName} {customer?.lastName}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <EmailIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {customer?.email || "N/A"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {customer?.phone || "N/A"}
              </Typography>
            </Box>
            <Button 
              size="small" 
              startIcon={<PersonIcon />}
              onClick={() => customer && router.push(`/customers/${customer.id}`)}
              sx={{ mt: 1, textTransform: "none" }}
            >
              View Customer Profile
            </Button>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">Booking ID:</Typography>
            <Typography variant="body1" fontWeight="bold">#{booking.id}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>Booked On:</Typography>
            <Typography variant="body2">{formatDateTime(booking.createdAt)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>Booked By:</Typography>
            <Typography variant="body2">{booking.createdByUser?.firstName || "System"}</Typography>
          </Box>
        </Box>
      </Card>

      <Card sx={{ borderRadius: 2, mb: 2, overflow: "hidden" }}>
        <Box sx={{ bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
            Property Google Map View
          </Typography>
        </Box>
        {mapAddress && googleMapsApiKey ? (
          <iframe
            width="100%"
            height="200"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(mapAddress)}&maptype=satellite&zoom=18`}
          />
        ) : (
          <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.200" }}>
            <Typography color="text.secondary">Map unavailable</Typography>
          </Box>
        )}
      </Card>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <IconButton sx={{ bgcolor: "action.hover", width: 48, height: 48 }}>
            <MessageIcon />
          </IconButton>
          <Typography variant="caption" display="block">Message</Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <IconButton sx={{ bgcolor: "action.hover", width: 48, height: 48 }} component="a" href={`mailto:${customer?.email}`}>
            <EmailIcon />
          </IconButton>
          <Typography variant="caption" display="block">Email</Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <IconButton sx={{ bgcolor: "action.hover", width: 48, height: 48 }} component="a" href={`tel:${customer?.phone}`}>
            <PhoneIcon />
          </IconButton>
          <Typography variant="caption" display="block">Call</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <Button fullWidth variant="outlined" onClick={handleGetDirections} sx={{ borderRadius: 2, py: 1.5, borderColor: "divider", textTransform: "uppercase" }}>
          Get Directions
        </Button>
        <Button 
          fullWidth 
          variant="outlined" 
          onClick={handleStartJob}
          disabled={booking.status === "in_progress" || booking.status === "completed"}
          sx={{ borderRadius: 2, py: 1.5, borderColor: "divider", textTransform: "uppercase" }}
        >
          Start Job
        </Button>
      </Box>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight="bold">Property Address</Typography>
          <Button size="small" variant="outlined" color="primary" onClick={() => customer && router.push(`/customers/${customer.id}`)}>
            Update Property
          </Button>
        </Box>
        <CardContent>
          <Chip label="Property #01" size="small" sx={{ mb: 1, bgcolor: "action.selected" }} />
          <Typography variant="body2" sx={{ mb: 1 }}>
            {booking.address || `${customer?.streetAddress1 || ""}, ${customer?.city || ""}, ${customer?.state || "ON"}`}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip label="Billing Address" size="small" variant="outlined" />
            <Chip label="Service Address" size="small" sx={{ bgcolor: "grey.800", color: "white" }} />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight="bold">Booking Date & Time</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Assigned to crew:</Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={booking.crewId || ""}
                onChange={(e) => handleCrewChange(e.target.value)}
                displayEmpty
                sx={{ 
                  bgcolor: crew?.color || "grey.400", 
                  color: "#fff", 
                  borderRadius: 2,
                  "& .MuiSelect-select": { py: 0.5, px: 1.5 },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {crews.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: c.color }} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <CardContent>
          <Box sx={{ display: "flex", gap: 4, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarIcon sx={{ color: "text.secondary" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Scheduled For</Typography>
                <Typography variant="body1" fontWeight="medium">{formatDate(booking.scheduledDate)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TimeIcon sx={{ color: "text.secondary" }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Time</Typography>
                <Typography variant="body1" fontWeight="medium">{formatTime(booking.startTime) || "TBD"}</Typography>
              </Box>
            </Box>
          </Box>
          {booking.createdAt && (
            <Typography variant="body2" color="text.secondary">
              Created: {formatDateTime(booking.createdAt)}
            </Typography>
          )}
        </CardContent>
        <Box sx={{ display: "flex", gap: 1, px: 2, pb: 2 }}>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ textTransform: "uppercase" }}
            onClick={() => setAddServiceDialogOpen(true)}
          >
            Add Services
          </Button>
          <Button variant="outlined" size="small" sx={{ textTransform: "uppercase" }} disabled>Add Items</Button>
          <Button variant="outlined" size="small" sx={{ textTransform: "uppercase" }} disabled>Add Discount</Button>
        </Box>
      </Card>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight="bold">Services Requested</Typography>
        </Box>
        <CardContent>
          {booking.services?.length > 0 ? (
            booking.services.map((bs) => (
              <Box key={bs.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="body2">{bs.service?.name || bs.serviceName || "Service"}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {editingServiceId === bs.id ? (
                    <TextField
                      size="small"
                      type="number"
                      value={servicePrices[bs.id] || ""}
                      onChange={(e) => setServicePrices({ ...servicePrices, [bs.id]: e.target.value })}
                      onBlur={() => handleUpdateServicePrice(bs.id, servicePrices[bs.id])}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateServicePrice(bs.id, servicePrices[bs.id])}
                      autoFocus
                      sx={{ width: 100 }}
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    />
                  ) : (
                    <>
                      <Typography variant="body2" fontWeight="bold">
                        ${(servicePrices[bs.id] || parseFloat(bs.price || 0)).toFixed(2)}
                      </Typography>
                      <IconButton size="small" onClick={() => setEditingServiceId(bs.id)}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRemoveService(bs.id)} color="error">
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            ))
          ) : (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2">{booking.serviceVariation || "General Service"}</Typography>
              <Typography variant="body2" fontWeight="bold">${subtotal.toFixed(2)}</Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {discountPercent > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, bgcolor: "success.light", mx: -2, px: 2, py: 0.5 }}>
              <Typography variant="body2">Season Pass Discount {discountPercent}%</Typography>
              <Typography variant="body2">-${discountAmount.toFixed(2)}</Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Amount:</Typography>
            <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
          </Box>
          {discountPercent > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Discount:</Typography>
              <Typography variant="body2" color="error.main">-${discountAmount.toFixed(2)}</Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
            <Typography variant="body2">${afterDiscount.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Tax: (HST 13%)</Typography>
            <Typography variant="body2">+${taxAmount.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body1" fontWeight="bold">Total</Typography>
            <Typography variant="body1" fontWeight="bold">${total.toFixed(2)}</Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Job Status</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={booking.status}
              onChange={async (e) => {
                const newStatus = e.target.value;
                await fetch(`/api/bookings/${params.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: newStatus }),
                });
                setBooking({ ...booking, status: newStatus });
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: opt.color }} />
                    {opt.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight="bold">Note</Typography>
          <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingNote(true)}>Edit</Button>
        </Box>
        <CardContent>
          {editingNote ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add notes about this booking..."
              />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button size="small" onClick={() => setEditingNote(false)}>Cancel</Button>
                <Button size="small" variant="contained" onClick={handleSaveNote} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color={booking.noteFromBusiness ? "text.primary" : "text.secondary"}>
              {booking.noteFromBusiness || "No notes added"}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <Button fullWidth variant="outlined" disabled sx={{ borderRadius: 2, py: 1.5, borderColor: "divider" }}>
          Generate Invoice
        </Button>
        <Button fullWidth variant="outlined" onClick={() => router.push(`/bookings/${booking.id}/edit`)} sx={{ borderRadius: 2, py: 1.5, borderColor: "divider" }}>
          Update Job
        </Button>
        <Button 
          fullWidth 
          variant="outlined" 
          color="error"
          onClick={() => setCancelDialogOpen(true)}
          disabled={booking.status === "cancelled"}
          sx={{ borderRadius: 2, py: 1.5 }}
        >
          Cancel Booking
        </Button>
      </Box>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel this booking? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Booking</Button>
          <Button onClick={handleCancelBooking} color="error" variant="contained">Cancel Booking</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addServiceDialogOpen} onClose={() => setAddServiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Service</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Select Service</Typography>
            <Select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                const serviceId = parseInt(e.target.value);
                const service = availableServices.find(s => s.id === serviceId);
                
                let priceToUse = null;
                if (booking?.propertyPricing && booking.propertyPricing[serviceId]) {
                  priceToUse = booking.propertyPricing[serviceId];
                } else if (service?.basePrice) {
                  priceToUse = service.basePrice;
                }
                
                setNewServicePrice(priceToUse ? priceToUse.toString() : "");
              }}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select a service...</em>
              </MenuItem>
              {availableServices.length === 0 ? (
                <MenuItem disabled>
                  <em>No services available</em>
                </MenuItem>
              ) : (
                availableServices.map((service) => {
                  const customPrice = booking?.propertyPricing?.[service.id];
                  const displayPrice = customPrice || service.basePrice;
                  return (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name} {displayPrice ? `($${displayPrice})` : ""}
                      {customPrice && <Typography component="span" sx={{ ml: 0.5, fontSize: "0.75rem", color: "success.main" }}>(custom)</Typography>}
                    </MenuItem>
                  );
                })
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Price"
            type="number"
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            helperText={!newServicePrice ? "Enter a price for this service" : ""}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddServiceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddService} variant="contained" disabled={!selectedServiceId || !newServicePrice}>
            Add Service
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Content>
  );
}
