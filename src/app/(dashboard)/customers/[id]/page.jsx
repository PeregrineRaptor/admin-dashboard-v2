"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Avatar,
  IconButton,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  Snackbar,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Verified as VerifiedIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Star as StarIcon,
  History as HistoryIcon,
  Message as MessageIcon,
  Call as CallIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";

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

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(0);
  const [propertyData, setPropertyData] = useState({});
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyServicePricing, setPropertyServicePricing] = useState([]);
  const [addServiceAnchor, setAddServiceAnchor] = useState(null);
  const [newServicePrice, setNewServicePrice] = useState("");
  const [selectedNewService, setSelectedNewService] = useState(null);
  const [services, setServices] = useState([]);
  const [crews, setCrews] = useState([]);
  const [bookingData, setBookingData] = useState({
    scheduledDate: "",
    startTime: "09:00",
    crewId: "",
    selectedServices: [],
    noteFromBusiness: "",
    selectedPropertyId: null,
  });
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetch("/api/services").then(r => r.json()).then(setServices).catch(console.error);
    fetch("/api/crews").then(r => r.json()).then(setCrews).catch(console.error);
  }, []);

  const fetchAiRecommendations = async () => {
    const property = customer?.properties?.find(p => p.id === bookingData.selectedPropertyId) || customer?.properties?.[0];
    const city = property?.city || customer?.city;
    setAiLoading(true);
    try {
      const res = await fetch("/api/bookings/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id,
          city,
          serviceIds: bookingData.selectedServices,
        }),
      });
      const data = await res.json();
      setAiRecommendations(data.recommendations || []);
      setAiAnalysis(data.analysis || "");
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      setAiRecommendations([]);
      setAiAnalysis("Unable to get recommendations");
    }
    setAiLoading(false);
  };

  const handleOpenBookingDialog = () => {
    setBookingDialogOpen(true);
    setBookingError("");
    setAiRecommendations([]);
    setAiAnalysis("");
    setPropertySelectOpen(false);
    const defaultProperty = customer?.properties?.[0];
    setBookingData(prev => ({
      ...prev,
      selectedPropertyId: defaultProperty?.id || null,
      selectedServices: [],
    }));
    if (customer) {
      fetchAiRecommendations();
    }
  };

  const calculatePricing = () => {
    let subtotal = 0;
    const property = customer?.properties?.find(p => p.id === bookingData.selectedPropertyId) || customer?.properties?.[0];
    bookingData.selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        let price = parseFloat(service.basePrice || 0);
        const propertyPricing = property?.servicePricing?.find(p => p.serviceId === serviceId);
        if (propertyPricing) {
          price = parseFloat(propertyPricing.customPrice);
        }
        subtotal += price;
      }
    });
    
    let discountAmount = 0;
    const hasActivePass = isSeasonPassActive();
    if (hasActivePass) {
      discountAmount = subtotal * 0.25;
    }
    
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.13;
    const totalAmount = discountedSubtotal + taxAmount;
    
    return { subtotal, discountAmount, discountedSubtotal, taxAmount, totalAmount, hasActivePass };
  };

  const calculateTotal = () => {
    return calculatePricing().totalAmount;
  };

  const handleCreateBooking = async () => {
    if (!bookingData.scheduledDate) {
      setBookingError("Please select a date");
      return;
    }
    if (bookingData.selectedServices.length === 0) {
      setBookingError("Please select at least one service");
      return;
    }

    setBookingSaving(true);
    setBookingError("");
    const property = customer?.properties?.find(p => p.id === bookingData.selectedPropertyId) || customer?.properties?.[0];

    try {
      const pricing = calculatePricing();
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          propertyId: property?.id,
          crewId: bookingData.crewId || null,
          scheduledDate: bookingData.scheduledDate,
          startTime: bookingData.startTime,
          status: "confirmed",
          address: property ? [property.streetAddress1, property.city, property.state, property.postalCode].filter(Boolean).join(", ") : "",
          subtotal: pricing.subtotal,
          discountType: pricing.hasActivePass ? "season_pass" : null,
          discountAmount: pricing.discountAmount > 0 ? pricing.discountAmount : null,
          discountNote: pricing.hasActivePass ? "Season Pass 25% discount" : null,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          noteFromBusiness: bookingData.noteFromBusiness,
          services: bookingData.selectedServices.map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            let price = parseFloat(service?.basePrice || 0);
            const propertyPricing = property?.servicePricing?.find(p => p.serviceId === serviceId);
            if (propertyPricing) {
              price = parseFloat(propertyPricing.customPrice);
            }
            return { serviceId, price: price.toFixed(2) };
          }),
        }),
      });

      if (res.ok) {
        setBookingDialogOpen(false);
        setBookingData({ scheduledDate: "", startTime: "09:00", crewId: "", selectedServices: [], noteFromBusiness: "" });
        const updated = await fetch(`/api/customers/${params.id}`).then(r => r.json());
        setCustomer(updated);
      } else {
        setBookingError("Failed to create booking");
      }
    } catch (error) {
      setBookingError("Failed to create booking");
    }
    setBookingSaving(false);
  };

  const toggleService = (serviceId) => {
    setBookingData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  const openEditDialog = () => {
    setEditData({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      companyName: customer.companyName || "",
      hasSeasonPass: customer.hasSeasonPass || false,
      seasonPassYear: customer.seasonPassYear || "",
      seasonPassPurchaseDate: customer.seasonPassPurchaseDate || "",
      seasonPassExpiryDate: customer.seasonPassExpiryDate || "",
      seasonPassPrice: customer.seasonPassPrice || "150.00",
      memo: customer.memo || "",
    });
    setEditDialogOpen(true);
  };

  const handleActivateSeasonPass = () => {
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    setEditData({
      ...editData,
      hasSeasonPass: true,
      seasonPassYear: today.getFullYear(),
      seasonPassPurchaseDate: today.toISOString().split('T')[0],
      seasonPassExpiryDate: expiryDate.toISOString().split('T')[0],
      seasonPassPrice: "150.00",
    });
  };

  const isSeasonPassActive = () => {
    if (!customer?.hasSeasonPass || !customer?.seasonPassExpiryDate) return false;
    const expiry = new Date(customer.seasonPassExpiryDate);
    return expiry >= new Date();
  };

  const handleSaveCustomer = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!data.error) {
        setCustomer({ ...customer, ...data });
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error("Error saving customer:", error);
    }
    setEditSaving(false);
  };

  const openPropertyDialog = async (property = null) => {
    if (property) {
      setPropertyData({
        id: property.id,
        name: property.name || "",
        streetAddress1: property.streetAddress1 || "",
        streetAddress2: property.streetAddress2 || "",
        city: property.city || "",
        state: property.state || "",
        postalCode: property.postalCode || "",
        isBillingAddress: property.isBillingAddress || false,
        isServiceAddress: property.isServiceAddress || true,
        windowsPrice: property.windowsPrice || "",
        eavesPrice: property.eavesPrice || "",
        memo: property.memo || "",
      });
      try {
        const res = await fetch(`/api/customers/${params.id}/properties/${property.id}/services`);
        const pricing = await res.json();
        setPropertyServicePricing(Array.isArray(pricing) ? pricing : []);
      } catch (err) {
        console.error("Error fetching property pricing:", err);
        setPropertyServicePricing([]);
      }
    } else {
      setPropertyData({
        name: "",
        streetAddress1: "",
        streetAddress2: "",
        city: "",
        state: "",
        postalCode: "",
        isBillingAddress: false,
        isServiceAddress: true,
        windowsPrice: "",
        eavesPrice: "",
        memo: "",
      });
      setPropertyServicePricing([]);
    }
    setPropertyDialogOpen(true);
  };

  const handleAddServicePricing = async () => {
    if (!selectedNewService || !newServicePrice || !propertyData.id) return;
    try {
      const res = await fetch(`/api/customers/${params.id}/properties/${propertyData.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedNewService.id,
          customPrice: parseFloat(newServicePrice),
        }),
      });
      if (res.ok) {
        const pricingRes = await fetch(`/api/customers/${params.id}/properties/${propertyData.id}/services`);
        const pricing = await pricingRes.json();
        setPropertyServicePricing(Array.isArray(pricing) ? pricing : []);
        setSelectedNewService(null);
        setNewServicePrice("");
        setAddServiceAnchor(null);
      }
    } catch (err) {
      console.error("Error adding service pricing:", err);
    }
  };

  const handleDeleteServicePricing = async (pricingId) => {
    if (!propertyData.id) return;
    try {
      await fetch(`/api/customers/${params.id}/properties/${propertyData.id}/services?pricingId=${pricingId}`, {
        method: "DELETE",
      });
      setPropertyServicePricing(propertyServicePricing.filter(p => p.id !== pricingId));
    } catch (err) {
      console.error("Error deleting service pricing:", err);
    }
  };

  const availableServicesToAdd = services.filter(
    s => !propertyServicePricing.some(p => p.serviceId === s.id)
  );

  const handleSaveProperty = async () => {
    setPropertySaving(true);
    try {
      const url = propertyData.id 
        ? `/api/customers/${params.id}/properties/${propertyData.id}`
        : `/api/customers/${params.id}/properties`;
      const method = propertyData.id ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propertyData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setPropertyDialogOpen(false);
        const updated = await fetch(`/api/customers/${params.id}`).then(r => r.json());
        setCustomer(updated);
        setSnackbar({ open: true, message: "Property saved successfully", severity: "success" });
      } else {
        console.error("Error saving property:", data);
        setSnackbar({ open: true, message: data.error || "Failed to save property", severity: "error" });
      }
    } catch (error) {
      console.error("Error saving property:", error);
      setSnackbar({ open: true, message: "Failed to save property", severity: "error" });
    }
    setPropertySaving(false);
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/customers/${params.id}`);
        const data = await res.json();
        if (data.error) {
          console.error(data.error);
          return;
        }
        setCustomer(data);
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
      setLoading(false);
    };

    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  if (loading) {
    return (
      <Content>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <BrandLoader />
        </Box>
      </Content>
    );
  }

  if (!customer) {
    return (
      <Content>
        <Typography color="error">Customer not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Content>
    );
  }

  const selectedProperty = customer.properties?.[selectedPropertyIndex];
  const fullAddress = selectedProperty 
    ? [selectedProperty.streetAddress1, selectedProperty.city, selectedProperty.state, selectedProperty.postalCode].filter(Boolean).join(", ")
    : "";

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapUrl = mapsApiKey && selectedProperty?.latitude && selectedProperty?.longitude
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${selectedProperty.latitude},${selectedProperty.longitude}&zoom=18&maptype=satellite`
    : mapsApiKey && fullAddress
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(fullAddress)}&zoom=18&maptype=satellite`
    : null;

  const lifetimeValue = parseFloat(customer.lifetimeSpend || 0);
  const transactionCount = customer.transactionCount || 0;
  const avgSpend = transactionCount > 0 ? lifetimeValue / transactionCount : 0;
  const initials = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase();
  
  const upcomingBookings = customer.bookings?.filter(b => 
    b.scheduledDate >= new Date().toISOString().split("T")[0] && 
    (b.status === "confirmed" || b.status === "pending")
  ) || [];
  
  const pastBookings = customer.bookings?.filter(b => 
    b.scheduledDate < new Date().toISOString().split("T")[0] || b.status === "completed"
  ) || [];

  return (
    <Content>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ bgcolor: "action.hover" }}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="body2" color="text.secondary">Customer CRM</Typography>
          <Typography variant="h5" fontWeight="bold">Customer CRM Details</Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: "bold" }}>
                    {initials || "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {customer.firstName} {customer.lastName}
                    </Typography>
                    {customer.hasSeasonPass && (
                      <Chip 
                        label={`Season Pass ${isSeasonPassActive() ? '(Active)' : '(Expired)'}`} 
                        size="small" 
                        color={isSeasonPassActive() ? "success" : "default"} 
                        sx={{ mt: 0.5 }} 
                      />
                    )}
                  </Box>
                </Box>
                <IconButton size="small" onClick={openEditDialog}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {customer.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.email}</Typography>
                  </Box>
                )}
                {customer.phone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.phone}</Typography>
                  </Box>
                )}
                {customer.companyName && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.companyName}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {customer.hasSeasonPass && (
            <Card sx={{ borderRadius: 2, mb: 2, bgcolor: isSeasonPassActive() ? 'success.lighter' : 'action.hover', border: isSeasonPassActive() ? '1px solid' : 'none', borderColor: 'success.main' }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold" color={isSeasonPassActive() ? "success.dark" : "text.secondary"}>
                    Season Pass
                  </Typography>
                  <Chip 
                    label={isSeasonPassActive() ? "25% OFF" : "Expired"} 
                    size="small" 
                    color={isSeasonPassActive() ? "success" : "default"}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {customer.seasonPassPurchaseDate && (
                    <>Purchased: {new Date(customer.seasonPassPurchaseDate).toLocaleDateString()}</>
                  )}
                  {customer.seasonPassExpiryDate && (
                    <> | Expires: {new Date(customer.seasonPassExpiryDate).toLocaleDateString()}</>
                  )}
                </Typography>
                {customer.seasonPassPrice && (
                  <Typography variant="caption" color="text.secondary">
                    Paid: ${parseFloat(customer.seasonPassPrice).toFixed(2)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Property Profile
              </Typography>
              
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {customer.properties?.map((prop, idx) => (
                  <Chip
                    key={prop.id}
                    label={prop.name || `Property #${String(idx + 1).padStart(2, '0')}`}
                    variant={selectedPropertyIndex === idx ? "filled" : "outlined"}
                    color={selectedPropertyIndex === idx ? "primary" : "default"}
                    onClick={() => setSelectedPropertyIndex(idx)}
                    onDelete={selectedPropertyIndex === idx ? () => openPropertyDialog(prop) : undefined}
                    deleteIcon={selectedPropertyIndex === idx ? <EditIcon fontSize="small" /> : undefined}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
                <Chip
                  icon={<AddIcon />}
                  label="New Property"
                  variant="outlined"
                  onClick={() => openPropertyDialog(null)}
                  sx={{ cursor: "pointer" }}
                />
              </Box>
              
              {selectedProperty && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {fullAddress || "No address set"}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {selectedProperty.isBillingAddress && (
                      <Chip label="Billing Address" size="small" variant="outlined" />
                    )}
                    {selectedProperty.isServiceAddress && (
                      <Chip label="Service Address" size="small" variant="outlined" />
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Upcoming Appointments
                </Typography>
              </Box>
              {upcomingBookings.length > 0 ? (
                upcomingBookings.slice(0, 3).map((booking) => (
                  <Box 
                    key={booking.id} 
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">
                        {booking.services?.[0]?.service?.name || "Service"}
                      </Typography>
                      <Typography variant="caption" color="primary">View</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(booking.scheduledDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}, {booking.startTime?.slice(0, 5) || "TBD"}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {booking.crew?.name || "Unassigned"}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No upcoming appointments</Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Post Appointments / Purchase
                </Typography>
                <Button size="small">View All</Button>
              </Box>
              {pastBookings.length > 0 ? (
                pastBookings.slice(0, 3).map((booking) => (
                  <Box 
                    key={booking.id} 
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">
                        {booking.services?.[0]?.service?.name || "Service"}
                      </Typography>
                      <Typography variant="caption" color="primary">View</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(booking.scheduledDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}, {booking.startTime?.slice(0, 5) || "TBD"}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {booking.crew?.name || "Unassigned"}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No past appointments</Typography>
              )}
            </CardContent>
          </Card>
          
          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">Note</Typography>
                <Button size="small" startIcon={<AddIcon />}>Add Note</Button>
              </Box>
              {customer.memo ? (
                <Typography variant="body2" color="text.secondary">{customer.memo}</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">No notes</Typography>
              )}
            </CardContent>
          </Card>
          
          <Button 
            variant="outlined" 
            color="error" 
            fullWidth 
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
          >
            Delete Customer
          </Button>
        </Grid>

        <Grid item xs={12} md={8}>
          {mapUrl && (
            <Card sx={{ borderRadius: 2, mb: 2, overflow: "hidden" }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ p: 2, pb: 1 }}>
                Property Google Map View
              </Typography>
              <iframe
                width="100%"
                height="250"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapUrl}
              ></iframe>
            </Card>
          )}

          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              sx={{ borderRadius: 2, px: 4 }}
              onClick={handleOpenBookingDialog}
            >
              Book Appointment
            </Button>
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 3 }}>
            <Tooltip title="Message">
              <IconButton sx={{ bgcolor: "grey.100" }}>
                <MessageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Email">
              <IconButton sx={{ bgcolor: "grey.100" }}>
                <EmailIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Call">
              <IconButton sx={{ bgcolor: "grey.100" }}>
                <CallIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Buyer Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Customer Since</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {customer.firstVisit 
                      ? new Date(customer.firstVisit).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
                      : "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Last Visit</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {customer.lastVisit 
                      ? new Date(customer.lastVisit).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
                      : "-"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">Activity</Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Spend: ${avgSpend.toFixed(2)}
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {customer.bookings?.slice(0, 5).map((booking) => (
                      <TableRow 
                        key={booking.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => router.push(`/bookings/${booking.id}`)}
                      >
                        <TableCell sx={{ border: 0 }}>
                          <Typography variant="body2" fontWeight="medium">
                            ${parseFloat(booking.totalAmount || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ border: 0 }}>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(booking.scheduledDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}, {booking.startTime?.slice(0, 5) || "TBD"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          <Typography variant="caption" color="primary">View</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {customer.bookings?.length > 5 && (
                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Button size="small">View All</Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Booking Details
          <Typography variant="caption" display="block" color="text.secondary">
            Booking › Booking Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {bookingError && (
            <Alert severity="error" sx={{ mb: 2 }}>{bookingError}</Alert>
          )}
          
          {customer?.hasSeasonPass && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Season Pass holder - 25% discount will be applied!
            </Alert>
          )}

          <Card sx={{ mb: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <CardContent sx={{ pb: "16px !important" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: "grey.300", color: "text.primary", fontWeight: "bold" }}>
                  {customer?.firstName?.[0]}{customer?.lastName?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {customer?.firstName} {customer?.lastName}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{customer?.email || "N/A"}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{customer?.phone || "N/A"}</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight="bold">Property Address</Typography>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => setPropertySelectOpen(!propertySelectOpen)}
              >
                {propertySelectOpen ? "Close" : "Select Property"}
              </Button>
            </Box>
            {propertySelectOpen ? (
              <Box sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
                {customer?.properties?.map((prop, idx) => (
                  <Card 
                    key={prop.id}
                    variant={bookingData.selectedPropertyId === prop.id ? "outlined" : "elevation"}
                    sx={{ 
                      flex: "1 1 calc(50% - 8px)", 
                      minWidth: 200,
                      cursor: "pointer",
                      borderColor: bookingData.selectedPropertyId === prop.id ? "primary.main" : "divider",
                      bgcolor: bookingData.selectedPropertyId === prop.id ? "action.selected" : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => {
                      setBookingData({ ...bookingData, selectedPropertyId: prop.id, selectedServices: [] });
                      setPropertySelectOpen(false);
                    }}
                  >
                    <CardContent sx={{ pb: "12px !important" }}>
                      <Chip label={`Property #${String(idx + 1).padStart(2, "0")}`} size="small" sx={{ mb: 1, bgcolor: "action.selected" }} />
                      <Typography variant="body2">
                        {prop.streetAddress1}, {prop.city}, {prop.state || "ON"}
                        {prop.postalCode ? `, ${prop.postalCode}` : ""}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        {prop.isBillingAddress && (
                          <Chip label="Billing Address" size="small" variant="outlined" />
                        )}
                        {prop.isServiceAddress !== false && (
                          <Chip label="Service Address" size="small" sx={{ bgcolor: "grey.800", color: "white" }} />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <CardContent>
                {(() => {
                  const selectedProp = customer?.properties?.find(p => p.id === bookingData.selectedPropertyId);
                  const propIdx = customer?.properties?.findIndex(p => p.id === bookingData.selectedPropertyId);
                  if (!selectedProp) return <Typography color="text.secondary">No property selected</Typography>;
                  return (
                    <>
                      <Chip label={`Property #${String((propIdx || 0) + 1).padStart(2, "0")}`} size="small" sx={{ mb: 1, bgcolor: "action.selected" }} />
                      <Typography variant="body2">
                        {selectedProp.streetAddress1}, {selectedProp.city}, {selectedProp.state || "ON"}
                        {selectedProp.postalCode ? `, ${selectedProp.postalCode}` : ""}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        {selectedProp.isBillingAddress && (
                          <Chip label="Billing Address" size="small" variant="outlined" />
                        )}
                        {selectedProp.isServiceAddress !== false && (
                          <Chip label="Service Address" size="small" sx={{ bgcolor: "grey.800", color: "white" }} />
                        )}
                      </Box>
                    </>
                  );
                })()}
              </CardContent>
            )}
          </Card>
          
          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight="bold">Booking Date & Time</Typography>
            </Box>
            <CardContent>
              <Box sx={{ mb: 2, p: 2, bgcolor: "primary.light", borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="caption" fontWeight="bold" color="primary.dark">
                    AI Scheduling Recommendations
                  </Typography>
                  {aiLoading && <BrandLoader size={24} />}
                </Box>
                {aiRecommendations.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {aiRecommendations.map((rec, idx) => (
                      <Chip
                        key={idx}
                        label={`${new Date(rec.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${rec.crewName ? ` - ${rec.crewName}` : ""}`}
                        onClick={() => {
                          setBookingData({ 
                            ...bookingData, 
                            scheduledDate: rec.date,
                            crewId: crews.find(c => c.name === rec.crewName)?.id || bookingData.crewId 
                          });
                        }}
                        sx={{ 
                          cursor: "pointer", 
                          bgcolor: bookingData.scheduledDate === rec.date ? "primary.main" : "white",
                          color: bookingData.scheduledDate === rec.date ? "white" : "text.primary",
                          "&:hover": { bgcolor: bookingData.scheduledDate === rec.date ? "primary.dark" : "grey.100" },
                        }}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
                {!aiLoading && aiRecommendations.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No AI recommendations available
                  </Typography>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Date"
                    size="small"
                    value={bookingData.scheduledDate}
                    onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Time"
                    size="small"
                    value={bookingData.startTime}
                    onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assign Crew</InputLabel>
                    <Select
                      value={bookingData.crewId}
                      label="Assign Crew"
                      onChange={(e) => setBookingData({ ...bookingData, crewId: e.target.value })}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {crews.map((crew) => (
                        <MenuItem key={crew.id} value={crew.id}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: crew.color }} />
                            {crew.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight="bold">Services</Typography>
            </Box>
            <CardContent sx={{ pt: 1 }}>
              {(() => {
                const selectedProp = customer?.properties?.find(p => p.id === bookingData.selectedPropertyId);
                const propServices = selectedProp?.servicePricing || [];
                
                if (propServices.length > 0) {
                  return propServices.map((pricing) => {
                    const service = services.find(s => s.id === pricing.serviceId);
                    const price = parseFloat(pricing.customPrice);
                    const discountedPrice = customer?.hasSeasonPass ? price * 0.75 : price;
                    const isSelected = bookingData.selectedServices.includes(pricing.serviceId);
                    
                    return (
                      <Box
                        key={pricing.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.5,
                          mb: 1,
                          border: 1,
                          borderColor: isSelected ? "primary.main" : "divider",
                          borderRadius: 2,
                          cursor: "pointer",
                          bgcolor: isSelected ? "action.selected" : "transparent",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => toggleService(pricing.serviceId)}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Checkbox checked={isSelected} size="small" />
                          <Typography variant="body2" fontWeight="medium">
                            {service?.name || `Service #${pricing.serviceId}`}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          ${(customer?.hasSeasonPass ? discountedPrice : price).toFixed(2)}
                        </Typography>
                      </Box>
                    );
                  });
                }
                
                return services.filter(s => s.isActive).map((service) => {
                  let price = parseFloat(service.basePrice || 0);
                  const discountedPrice = customer?.hasSeasonPass ? price * 0.75 : price;
                  const isSelected = bookingData.selectedServices.includes(service.id);
                  
                  return (
                    <Box
                      key={service.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: isSelected ? "primary.main" : "divider",
                        borderRadius: 2,
                        cursor: "pointer",
                        bgcolor: isSelected ? "action.selected" : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      onClick={() => toggleService(service.id)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Checkbox checked={isSelected} size="small" />
                        <Typography variant="body2" fontWeight="medium">{service.name}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        ${(customer?.hasSeasonPass ? discountedPrice : price).toFixed(2)}
                      </Typography>
                    </Box>
                  );
                });
              })()}
            </CardContent>
          </Card>

          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight="bold">Note</Typography>
            </Box>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Add notes for this booking..."
                value={bookingData.noteFromBusiness}
                onChange={(e) => setBookingData({ ...bookingData, noteFromBusiness: e.target.value })}
                variant="standard"
                InputProps={{ disableUnderline: true }}
              />
            </CardContent>
          </Card>
          
          {bookingData.selectedServices.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" fontWeight="bold">Total</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  ${calculateTotal().toFixed(2)}
                </Typography>
              </Box>
              {customer?.hasSeasonPass && (
                <Typography variant="caption" color="success.main">
                  25% Season Pass discount applied
                </Typography>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => setBookingDialogOpen(false)}
            sx={{ flex: 1 }}
          >
            Cancel Booking
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateBooking}
            disabled={bookingSaving}
            sx={{ flex: 1 }}
          >
            {bookingSaving ? "Creating..." : "Book Customer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Edit Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editData.firstName || ""}
                onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={editData.lastName || ""}
                onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editData.email || ""}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={editData.phone || ""}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Name"
                value={editData.companyName || ""}
                onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, fontWeight: "bold" }}>
                Season Pass ($150 - 25% off all services for 1 year)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editData.hasSeasonPass || false}
                      onChange={(e) => setEditData({ ...editData, hasSeasonPass: e.target.checked })}
                    />
                  }
                  label="Active Season Pass"
                />
                {!editData.hasSeasonPass && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    color="success"
                    onClick={handleActivateSeasonPass}
                  >
                    Activate New Pass
                  </Button>
                )}
              </Box>
            </Grid>
            {editData.hasSeasonPass && (
              <>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Purchase Date"
                    type="date"
                    value={editData.seasonPassPurchaseDate || ""}
                    onChange={(e) => setEditData({ ...editData, seasonPassPurchaseDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={editData.seasonPassExpiryDate || ""}
                    onChange={(e) => setEditData({ ...editData, seasonPassExpiryDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Price Paid"
                    type="number"
                    value={editData.seasonPassPrice || ""}
                    onChange={(e) => setEditData({ ...editData, seasonPassPrice: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={editData.memo || ""}
                onChange={(e) => setEditData({ ...editData, memo: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCustomer} disabled={editSaving}>
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={propertyDialogOpen} onClose={() => setPropertyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {propertyData.id ? "Edit Property" : "Add New Property"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Property Name"
                value={propertyData.name || ""}
                onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                placeholder="e.g., Main House, Cottage, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={propertyData.streetAddress1 || ""}
                onChange={(e) => setPropertyData({ ...propertyData, streetAddress1: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address 2"
                value={propertyData.streetAddress2 || ""}
                onChange={(e) => setPropertyData({ ...propertyData, streetAddress2: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={propertyData.city || ""}
                onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Province/State"
                value={propertyData.state || ""}
                onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Postal Code"
                value={propertyData.postalCode || ""}
                onChange={(e) => setPropertyData({ ...propertyData, postalCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Address Type</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={propertyData.isBillingAddress || false}
                    onChange={(e) => setPropertyData({ ...propertyData, isBillingAddress: e.target.checked })}
                  />
                }
                label="Billing Address"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={propertyData.isServiceAddress !== false}
                    onChange={(e) => setPropertyData({ ...propertyData, isServiceAddress: e.target.checked })}
                  />
                }
                label="Service Address"
              />
            </Grid>
            {propertyData.id && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Estimates This Property</Typography>
                </Grid>
                <Grid item xs={12}>
                  {propertyServicePricing.length > 0 ? (
                    <List dense sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
                      {propertyServicePricing.map((pricing) => (
                        <ListItem key={pricing.id} sx={{ py: 1 }}>
                          <ListItemText
                            primary={pricing.service?.name || `Service #${pricing.serviceId}`}
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              ${parseFloat(pricing.customPrice).toFixed(2)}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteServicePricing(pricing.id)}
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      No service pricing set for this property
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={(e) => setAddServiceAnchor(e.currentTarget)}
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    Add Services
                  </Button>
                  <Menu
                    anchorEl={addServiceAnchor}
                    open={Boolean(addServiceAnchor)}
                    onClose={() => {
                      setAddServiceAnchor(null);
                      setSelectedNewService(null);
                      setNewServicePrice("");
                    }}
                    PaperProps={{ sx: { width: 320, p: 2 } }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Services</Typography>
                    {!selectedNewService ? (
                      <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
                        {availableServicesToAdd.map((service) => (
                          <ListItem
                            key={service.id}
                            component="div"
                            sx={{ 
                              cursor: "pointer", 
                              "&:hover": { bgcolor: "action.hover" },
                              borderRadius: 1,
                            }}
                            onClick={() => setSelectedNewService(service)}
                          >
                            <ListItemText
                              primary={service.name}
                              secondary={`Base: $${parseFloat(service.basePrice || 0).toFixed(2)}`}
                            />
                          </ListItem>
                        ))}
                        {availableServicesToAdd.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                            All services already added
                          </Typography>
                        )}
                      </List>
                    ) : (
                      <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>{selectedNewService.name}</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          label="Custom Price"
                          type="number"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" onClick={() => setSelectedNewService(null)}>Back</Button>
                          <Button 
                            size="small" 
                            variant="contained" 
                            onClick={handleAddServicePricing}
                            disabled={!newServicePrice}
                          >
                            Add
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Menu>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Note</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Keep distance from pet"
                value={propertyData.memo || ""}
                onChange={(e) => setPropertyData({ ...propertyData, memo: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPropertyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProperty} disabled={propertySaving}>
            {propertySaving ? "Saving..." : propertyData.id ? "Save Changes" : "Add Property"}
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
