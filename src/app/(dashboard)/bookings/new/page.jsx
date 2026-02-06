"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Checkbox,
  ListItemText,
  FormControlLabel,
  Paper,
} from "@mui/material";
import {
  PersonAdd,
  Person,
  CalendarMonth,
  AccessTime,
  CheckCircle,
  LocationOn,
  AutoAwesome,
  ArrowBack,
  Warning,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import Content from "@/components/common/Content";

const STEPS = ["Customer", "Schedule", "Confirm"];

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDate = searchParams.get("date");

  const [activeStep, setActiveStep] = useState(0);
  const [customerType, setCustomerType] = useState("existing");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);

  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    streetAddress1: "",
    city: "",
    state: "Ontario",
    postalCode: "",
  });

  const [services, setServices] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(preselectedDate || "");
  const [startTime, setStartTime] = useState("00:00");
  const [isAllDay, setIsAllDay] = useState(true);
  const [noteFromBusiness, setNoteFromBusiness] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [crewConflicts, setCrewConflicts] = useState([]);

  const [discountType, setDiscountType] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoNote, setPromoNote] = useState("");

  useEffect(() => {
    fetchServices();
    fetchCrews();
    if (preselectedDate) {
      setScheduledDate(preselectedDate);
    }
  }, [preselectedDate]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchProperties(selectedCustomer.id);
      if (hasActiveSeasonPass(selectedCustomer)) {
        setDiscountType("season_pass");
      } else {
        setDiscountType(null);
      }
    }
  }, [selectedCustomer]);

  const hasActiveSeasonPass = (customer) => {
    if (!customer?.hasSeasonPass) return false;
    if (customer.seasonPassExpiryDate) {
      return new Date(customer.seasonPassExpiryDate) >= new Date();
    }
    return customer.hasSeasonPass;
  };

  const getCity = () => {
    if (customerType === "existing" && selectedProperty) {
      return selectedProperty.city;
    }
    if (customerType === "existing" && selectedCustomer) {
      return selectedCustomer.city;
    }
    if (customerType === "new" && newCustomer.city) {
      return newCustomer.city;
    }
    return null;
  };

  useEffect(() => {
    const city = getCity();
    if (city && selectedServices.length > 0 && activeStep === 1) {
      fetchRecommendations(city, selectedServices);
    } else if (activeStep === 1) {
      setRecommendations([]);
      setAiAnalysis("");
    }
  }, [activeStep, selectedCustomer, selectedProperty, newCustomer.city, selectedServices]);

  useEffect(() => {
    if (selectedServices.length > 0 && crews.length > 0) {
      checkCrewConflicts();
    } else {
      setCrewConflicts([]);
    }
  }, [selectedServices, crews]);

  const checkCrewConflicts = () => {
    const conflicts = [];
    const serviceCrewSets = [];

    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      const crewsForService = crews.filter((c) =>
        c.services?.some((s) => s?.id === serviceId)
      );
      
      if (crewsForService.length === 0) {
        conflicts.push({
          type: "no_crew",
          service,
          message: `No crew assigned to "${service?.name}"`,
        });
      } else {
        serviceCrewSets.push({
          service,
          crewIds: new Set(crewsForService.map((c) => c.id)),
          crews: crewsForService,
        });
      }
    });

    if (serviceCrewSets.length > 1) {
      let commonCrewIds = new Set(serviceCrewSets[0].crewIds);
      for (let i = 1; i < serviceCrewSets.length; i++) {
        commonCrewIds = new Set(
          [...commonCrewIds].filter((id) => serviceCrewSets[i].crewIds.has(id))
        );
      }

      if (commonCrewIds.size === 0) {
        const details = serviceCrewSets.map((sc) => ({
          crews: sc.crews.map((c) => c.name).join(", "),
          services: [sc.service?.name],
        }));
        
        conflicts.push({
          type: "multiple_crews",
          message: "No single crew can do all selected services. Multiple crews needed:",
          details,
        });
      }
    }

    setCrewConflicts(conflicts);
  };

  const searchCustomers = async (search) => {
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=10`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };

  const fetchProperties = async (customerId) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/properties`);
      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchCrews = async () => {
    try {
      const res = await fetch("/api/crews");
      const data = await res.json();
      setCrews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching crews:", error);
    }
  };

  const fetchRecommendations = async (city, serviceIds) => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch("/api/bookings/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, serviceIds }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setAiAnalysis(data.analysis || "");
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
    setLoadingRecommendations(false);
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (customerType === "existing" && !selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }
      if (customerType === "new" && (!newCustomer.firstName || !newCustomer.city)) {
        toast.error("Please enter customer name and city");
        return;
      }
    }

    if (activeStep === 1) {
      if (!scheduledDate) {
        toast.error("Please select a date");
        return;
      }
      if (selectedServices.length === 0) {
        toast.error("Please select at least one service");
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (activeStep === 0) {
      router.push("/calendar");
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const calculatePricing = () => {
    let subtotal = selectedServices.reduce((sum, s) => {
      const service = services.find((svc) => svc.id === s);
      return sum + parseFloat(service?.basePrice || 0);
    }, 0);
    
    let discountAmount = 0;
    if (discountType === "season_pass") {
      discountAmount = subtotal * 0.25;
    } else if (discountType === "promo" && promoDiscount) {
      discountAmount = parseFloat(promoDiscount) || 0;
    }
    
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * 0.13;
    const totalAmount = discountedSubtotal + taxAmount;
    
    return { subtotal, discountAmount, discountedSubtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let customerId = selectedCustomer?.id;

      if (customerType === "new") {
        const customerRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCustomer),
        });
        const customerData = await customerRes.json();
        if (customerData.error) {
          throw new Error(customerData.error);
        }
        customerId = customerData.id;
      }

      const address =
        customerType === "existing"
          ? selectedProperty?.streetAddress1 || selectedCustomer?.streetAddress1 || ""
          : newCustomer.streetAddress1;

      const city = getCity();
      const fullAddress = `${address}, ${city}`;

      const pricing = calculatePricing();

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId: selectedProperty?.id || null,
          crewId: selectedCrew,
          scheduledDate,
          startTime: isAllDay ? "00:00" : startTime,
          isAllDay,
          address: fullAddress,
          subtotal: pricing.subtotal,
          discountType: discountType,
          discountAmount: pricing.discountAmount > 0 ? pricing.discountAmount : null,
          discountNote: discountType === "promo" ? promoNote : (discountType === "season_pass" ? "Season Pass 25% discount" : null),
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          noteFromBusiness,
          status: "pending",
          services: selectedServices.map((serviceId) => ({
            serviceId,
            price: services.find((s) => s.id === serviceId)?.basePrice || 0,
          })),
        }),
      });

      const bookingData = await bookingRes.json();
      if (bookingData.error) {
        throw new Error(bookingData.error);
      }

      toast.success("Booking created successfully!");
      router.push("/calendar");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking");
    }
    setSubmitting(false);
  };

  const renderCustomerStep = () => (
    <Box sx={{ mt: 2 }}>
      <ToggleButtonGroup
        value={customerType}
        exclusive
        onChange={(_, value) => value && setCustomerType(value)}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="existing">
          <Person sx={{ mr: 1 }} /> Existing Customer
        </ToggleButton>
        <ToggleButton value="new">
          <PersonAdd sx={{ mr: 1 }} /> New Customer
        </ToggleButton>
      </ToggleButtonGroup>

      {customerType === "existing" ? (
        <Box>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) =>
              `${option.firstName || ""} ${option.lastName || ""} - ${option.email || option.phone || ""}`
            }
            onInputChange={(_, value) => setCustomerSearch(value)}
            onChange={(_, value) => setSelectedCustomer(value)}
            value={selectedCustomer}
            renderInput={(params) => (
              <TextField {...params} label="Search Customer" placeholder="Type to search..." fullWidth />
            )}
            sx={{ mb: 2 }}
          />

          {selectedCustomer && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCustomer.email} | {selectedCustomer.phone}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <LocationOn fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                  {selectedCustomer.streetAddress1}, {selectedCustomer.city}
                </Typography>
              </CardContent>
            </Card>
          )}

          {properties.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Select Property:
              </Typography>
              <Grid container spacing={1}>
                {properties.map((prop) => (
                  <Grid item xs={12} sm={6} key={prop.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        border: selectedProperty?.id === prop.id ? 2 : 1,
                        borderColor: selectedProperty?.id === prop.id ? "primary.main" : "divider",
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedProperty(prop)} sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {prop.nickname || prop.streetAddress1}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {prop.city}, {prop.state}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="First Name"
              value={newCustomer.firstName}
              onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Last Name"
              value={newCustomer.lastName}
              onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Street Address"
              value={newCustomer.streetAddress1}
              onChange={(e) => setNewCustomer({ ...newCustomer, streetAddress1: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="City"
              value={newCustomer.city}
              onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Province"
              value={newCustomer.state}
              onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Postal Code"
              value={newCustomer.postalCode}
              onChange={(e) => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
              fullWidth
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderScheduleStep = () => {
    const city = getCity();
    const needsServiceSelection = selectedServices.length === 0;
    const needsCityInfo = !city;

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Services *</InputLabel>
              <Select
                multiple
                value={selectedServices}
                onChange={(e) => setSelectedServices(e.target.value)}
                label="Services *"
                MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => {
                      const service = services.find((s) => s.id === id);
                      return <Chip key={id} label={service?.name} size="small" />;
                    })}
                  </Box>
                )}
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    <Checkbox checked={selectedServices.includes(service.id)} />
                    <ListItemText primary={`${service.name} - $${service.basePrice}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {crewConflicts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {crewConflicts.map((conflict, idx) => (
              <Alert
                key={idx}
                severity={conflict.type === "no_crew" ? "error" : "warning"}
                icon={<Warning />}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" fontWeight="medium">
                  {conflict.message}
                </Typography>
                {conflict.details && (
                  <Box sx={{ mt: 1, pl: 1 }}>
                    {conflict.details.map((detail, i) => (
                      <Typography key={i} variant="caption" display="block">
                        • {detail.crews}: {detail.services.join(", ")}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            ))}
          </Box>
        )}

        {needsServiceSelection || needsCityInfo ? (
          <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 2 }}>
            {needsServiceSelection && needsCityInfo
              ? "Please select a service above. AI recommendations will appear once service and city are available."
              : needsServiceSelection
              ? "Please select a service above to see AI-recommended dates."
              : "City information is needed to generate AI recommendations."}
          </Alert>
        ) : loadingRecommendations ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography>AI is analyzing crew availability for {city}...</Typography>
          </Box>
        ) : recommendations.length > 0 ? (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <AutoAwesome color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                AI Recommended Dates
              </Typography>
            </Box>
            {aiAnalysis && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {aiAnalysis}
              </Typography>
            )}
            <Grid container spacing={1}>
              {recommendations.map((rec, idx) => (
                <Grid item xs={12} sm={4} key={idx}>
                  <Card
                    variant="outlined"
                    sx={{
                      border: scheduledDate === rec.date ? 2 : 1,
                      borderColor: scheduledDate === rec.date ? "primary.main" : "divider",
                    }}
                  >
                    <CardActionArea onClick={() => setScheduledDate(rec.date)} sx={{ p: 1.5 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {new Date(rec.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rec.reason}
                      </Typography>
                      {rec.crewName && <Chip label={rec.crewName} size="small" sx={{ mt: 0.5 }} />}
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            No AI recommendations available. {aiAnalysis || "Please select a date manually."}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAllDay}
                    onChange={(e) => {
                      setIsAllDay(e.target.checked);
                      if (e.target.checked) {
                        setStartTime("00:00");
                      }
                    }}
                  />
                }
                label="All Day"
              />
              {!isAllDay && (
                <TextField
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              All-day bookings are optimized the day before or when production fills
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Assign Crew (optional)</InputLabel>
              <Select
                value={selectedCrew || ""}
                onChange={(e) => setSelectedCrew(e.target.value || null)}
                label="Assign Crew (optional)"
              >
                <MenuItem value="">Unassigned</MenuItem>
                {crews.map((crew) => (
                  <MenuItem key={crew.id} value={crew.id}>
                    {crew.name}
                    {crew.services?.length > 0 && (
                      <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                        ({crew.services.map((s) => s?.name).filter(Boolean).join(", ")})
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={noteFromBusiness}
              onChange={(e) => setNoteFromBusiness(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderConfirmStep = () => {
    const customer = customerType === "existing" ? selectedCustomer : newCustomer;
    const pricing = calculatePricing();

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Review Booking
        </Typography>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Customer
            </Typography>
            <Typography fontWeight="medium">
              {customer?.firstName} {customer?.lastName}
              {hasActiveSeasonPass(selectedCustomer) && (
                <Chip label="Season Pass" size="small" color="success" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="body2">
              {selectedProperty?.streetAddress1 || customer?.streetAddress1},{" "}
              {selectedProperty?.city || customer?.city}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Schedule
            </Typography>
            <Typography fontWeight="medium">
              <CalendarMonth fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
              {scheduledDate &&
                new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
            </Typography>
            <Typography variant="body2">
              <AccessTime fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
              {isAllDay ? "All Day (time to be optimized)" : startTime}
            </Typography>
            {selectedCrew && (
              <Typography variant="body2">Crew: {crews.find((c) => c.id === selectedCrew)?.name}</Typography>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Services & Pricing
            </Typography>
            {selectedServices.map((id) => {
              const service = services.find((s) => s.id === id);
              return (
                <Box key={id} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">{service?.name}</Typography>
                  <Typography variant="body2">${parseFloat(service?.basePrice || 0).toFixed(2)}</Typography>
                </Box>
              );
            })}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">${pricing.subtotal.toFixed(2)}</Typography>
            </Box>
            
            {pricing.discountAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", color: "success.main" }}>
                <Typography variant="body2">
                  Discount ({discountType === "season_pass" ? "Season Pass 25%" : "Promo"})
                </Typography>
                <Typography variant="body2">-${pricing.discountAmount.toFixed(2)}</Typography>
              </Box>
            )}
            
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">HST (13%)</Typography>
              <Typography variant="body2">${pricing.taxAmount.toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight="bold">Total</Typography>
              <Typography fontWeight="bold">${pricing.totalAmount.toFixed(2)}</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Discount
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip 
                label="No Discount" 
                variant={!discountType ? "filled" : "outlined"}
                color={!discountType ? "primary" : "default"}
                onClick={() => { setDiscountType(null); setPromoDiscount(""); setPromoNote(""); }}
              />
              {customerType === "existing" && hasActiveSeasonPass(selectedCustomer) && (
                <Chip 
                  label="Season Pass (25% off)" 
                  variant={discountType === "season_pass" ? "filled" : "outlined"}
                  color={discountType === "season_pass" ? "success" : "default"}
                  onClick={() => { setDiscountType("season_pass"); setPromoDiscount(""); setPromoNote(""); }}
                />
              )}
              <Chip 
                label="Promo Discount" 
                variant={discountType === "promo" ? "filled" : "outlined"}
                color={discountType === "promo" ? "secondary" : "default"}
                onClick={() => setDiscountType("promo")}
              />
            </Box>
            
            {discountType === "promo" && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Discount Amount"
                    type="number"
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                    InputProps={{ startAdornment: "$" }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Discount Note"
                    value={promoNote}
                    onChange={(e) => setPromoNote(e.target.value)}
                    placeholder="e.g., First-time customer"
                  />
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        {crewConflicts.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Note: The selected services may require coordination between multiple crews.
          </Alert>
        )}

        {noteFromBusiness && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2">{noteFromBusiness}</Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Content>
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => router.push("/calendar")} color="inherit">
            Back
          </Button>
          <Typography variant="h5" fontWeight="bold">
            Create New Booking
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && renderCustomerStep()}
          {activeStep === 1 && renderScheduleStep()}
          {activeStep === 2 && renderConfirmStep()}

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button onClick={handleBack} disabled={submitting}>
              {activeStep === 0 ? "Cancel" : "Back"}
            </Button>
            {activeStep === STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={<CheckCircle />}>
                {submitting ? "Creating..." : "Create Booking"}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Content>
  );
}
