"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
} from "@mui/material";
import {
  PersonAdd,
  Person,
  CalendarMonth,
  AccessTime,
  CheckCircle,
  LocationOn,
  AutoAwesome,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const STEPS = ["Customer", "Schedule", "Confirm"];

export default function NewBookingDialog({ open, onClose, preselectedDate, onBookingCreated }) {
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
  const [startTime, setStartTime] = useState("09:00");
  const [noteFromBusiness, setNoteFromBusiness] = useState("");
  
  const [recommendations, setRecommendations] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchCrews();
      if (preselectedDate) {
        setScheduledDate(preselectedDate);
      }
    }
  }, [open, preselectedDate]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchProperties(selectedCustomer.id);
    }
  }, [selectedCustomer]);

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
    setActiveStep((prev) => prev - 1);
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
      
      const address = customerType === "existing" 
        ? (selectedProperty?.streetAddress1 || selectedCustomer?.streetAddress1 || "")
        : newCustomer.streetAddress1;
      
      const city = getCity();
      const fullAddress = `${address}, ${city}`;
      
      const totalAmount = selectedServices.reduce((sum, s) => {
        const service = services.find(svc => svc.id === s);
        return sum + parseFloat(service?.basePrice || 0);
      }, 0);
      
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId: selectedProperty?.id || null,
          crewId: selectedCrew,
          scheduledDate,
          startTime,
          address: fullAddress,
          subtotal: totalAmount,
          taxAmount: totalAmount * 0.13,
          totalAmount: totalAmount * 1.13,
          noteFromBusiness,
          status: "pending",
          services: selectedServices.map(serviceId => ({
            serviceId,
            price: services.find(s => s.id === serviceId)?.basePrice || 0,
          })),
        }),
      });
      
      const bookingData = await bookingRes.json();
      if (bookingData.error) {
        throw new Error(bookingData.error);
      }
      
      toast.success("Booking created successfully!");
      onBookingCreated?.(bookingData);
      handleClose();
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking");
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setActiveStep(0);
    setCustomerType("existing");
    setSelectedCustomer(null);
    setSelectedProperty(null);
    setProperties([]);
    setNewCustomer({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      streetAddress1: "",
      city: "",
      state: "Ontario",
      postalCode: "",
    });
    setSelectedServices([]);
    setSelectedCrew(null);
    setScheduledDate(preselectedDate || "");
    setStartTime("09:00");
    setNoteFromBusiness("");
    setRecommendations([]);
    setAiAnalysis("");
    onClose();
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
            getOptionLabel={(option) => `${option.firstName || ""} ${option.lastName || ""} - ${option.email || option.phone || ""}`}
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
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Property:</Typography>
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
                      const service = services.find(s => s.id === id);
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
              <Typography variant="subtitle1" fontWeight="bold">AI Recommended Dates</Typography>
            </Box>
            {aiAnalysis && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{aiAnalysis}</Typography>
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
                        {new Date(rec.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{rec.reason}</Typography>
                      {rec.crewName && (
                        <Chip label={rec.crewName} size="small" sx={{ mt: 0.5 }} />
                      )}
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
          <Grid item xs={6}>
            <TextField
              label="Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
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
    const totalAmount = selectedServices.reduce((sum, s) => {
      const service = services.find(svc => svc.id === s);
      return sum + parseFloat(service?.basePrice || 0);
    }, 0);

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Review Booking</Typography>
        
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
            <Typography fontWeight="medium">
              {customer?.firstName} {customer?.lastName}
            </Typography>
            <Typography variant="body2">
              {selectedProperty?.streetAddress1 || customer?.streetAddress1}, {selectedProperty?.city || customer?.city}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Schedule</Typography>
            <Typography fontWeight="medium">
              <CalendarMonth fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
              {scheduledDate && new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </Typography>
            <Typography variant="body2">
              <AccessTime fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
              {startTime}
            </Typography>
            {selectedCrew && (
              <Typography variant="body2">
                Crew: {crews.find(c => c.id === selectedCrew)?.name}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Services</Typography>
            {selectedServices.map((id) => {
              const service = services.find(s => s.id === id);
              return (
                <Box key={id} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">{service?.name}</Typography>
                  <Typography variant="body2">${service?.basePrice}</Typography>
                </Box>
              );
            })}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">${totalAmount.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">Tax (13%)</Typography>
              <Typography variant="body2">${(totalAmount * 0.13).toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">Total</Typography>
              <Typography variant="subtitle1" fontWeight="bold">${(totalAmount * 1.13).toFixed(2)}</Typography>
            </Box>
          </CardContent>
        </Card>

        {noteFromBusiness && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
              <Typography variant="body2">{noteFromBusiness}</Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Booking</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mt: 1 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderCustomerStep()}
        {activeStep === 1 && renderScheduleStep()}
        {activeStep === 2 && renderConfirmStep()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {submitting ? "Creating..." : "Create Booking"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
