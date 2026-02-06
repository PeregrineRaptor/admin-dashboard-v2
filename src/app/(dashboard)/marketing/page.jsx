"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Slider,
} from "@mui/material";
import { Delete, Search, Close, Email, Phone, AutoAwesome } from "@mui/icons-material";

const FILTER_PRESETS = [
  { id: "all", label: "All Customers", filters: [] },
  {
    id: "winback",
    label: "Win-Back",
    filters: [
      { field: "bookedLastYear", operator: "is", value: "true" },
      { field: "notBookedThisYear", operator: "is", value: "true" },
    ],
  },
  {
    id: "inactive",
    label: "Inactive (6+ months)",
    filters: [
      { field: "lastBookingDate", operator: "before", value: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    ],
  },
  {
    id: "new",
    label: "New Customers",
    filters: [
      { field: "customerCreatedDate", operator: "after", value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    ],
  },
  {
    id: "vip",
    label: "VIP ($2000+)",
    filters: [{ field: "lifetimeSpend", operator: "greaterThan", value: "2000" }],
  },
];

const FILTER_FIELDS = [
  { value: "city", label: "City", type: "text" },
  { value: "lifetimeSpend", label: "Lifetime Spend ($)", type: "number" },
  { value: "lastBookingDate", label: "Last Booking Date", type: "date" },
  { value: "hasSeasonPass", label: "Season Pass", type: "boolean" },
];

const OPERATORS = {
  text: [{ value: "is", label: "Is" }, { value: "isNot", label: "Is Not" }],
  number: [{ value: "greaterThan", label: "Greater Than" }, { value: "lessThan", label: "Less Than" }],
  date: [{ value: "before", label: "Before" }, { value: "after", label: "After" }],
  boolean: [{ value: "is", label: "Is" }],
};

const SEND_TIMES = (() => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour24 = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      const value = `${hour24}:${min}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${min} ${ampm}`;
      times.push({ value, label });
    }
  }
  return times;
})();

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  
  const getDefaultCampaign = () => ({
    name: "",
    brief: "",
    filters: [],
    selectedCustomerIds: [],
    sendEmail: true,
    emailSendDate: "",
    emailSendTime: "10:00",
    emailSubject: "",
    emailBody: "",
    sendCall: true,
    followUpDelayDays: 3,
    callSendDate: "",
    callSendTime: "10:00",
    callScript: "",
    callRetryCount: 2,
  });
  
  const [newCampaign, setNewCampaign] = useState(getDefaultCampaign());
  const [previewResults, setPreviewResults] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!newCampaign.brief || newCampaign.brief.trim().length < 10) {
      alert("Please provide a more detailed campaign brief (at least 10 characters)");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/campaigns/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: newCampaign.brief }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setNewCampaign((prev) => ({
        ...prev,
        emailSubject: data.emailSubject || prev.emailSubject,
        emailBody: data.emailBody || prev.emailBody,
        callScript: data.callScript || prev.callScript,
      }));
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      const filtered = data.customers.filter(
        (c) => !selectedCustomers.find((sc) => sc.id === c.id)
      );
      setCustomerSearchResults(filtered);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, [selectedCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setNewCampaign({ ...newCampaign, filters: [...preset.filters] });
    setPreviewResults(null);
  };

  const handleAddCustomer = (customer) => {
    if (!selectedCustomers.find((c) => c.id === customer.id)) {
      const updated = [...selectedCustomers, customer];
      setSelectedCustomers(updated);
      setNewCampaign({ ...newCampaign, selectedCustomerIds: updated.map((c) => c.id) });
    }
    setCustomerSearch("");
    setCustomerSearchResults([]);
  };

  const handleRemoveCustomer = (customerId) => {
    const updated = selectedCustomers.filter((c) => c.id !== customerId);
    setSelectedCustomers(updated);
    setNewCampaign({ ...newCampaign, selectedCustomerIds: updated.map((c) => c.id) });
  };

  const handleAddFilter = () => {
    setSelectedPreset(null);
    setNewCampaign({
      ...newCampaign,
      filters: [...newCampaign.filters, { field: "", operator: "", value: "" }],
    });
  };

  const handleRemoveFilter = (index) => {
    setSelectedPreset(null);
    const updatedFilters = newCampaign.filters.filter((_, i) => i !== index);
    setNewCampaign({ ...newCampaign, filters: updatedFilters });
  };

  const handleFilterChange = (index, key, value) => {
    setSelectedPreset(null);
    const updatedFilters = [...newCampaign.filters];
    updatedFilters[index][key] = value;
    if (key === "field") {
      updatedFilters[index].operator = "";
      updatedFilters[index].value = "";
    }
    setNewCampaign({ ...newCampaign, filters: updatedFilters });
  };

  const handlePreviewFilters = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/campaigns/filter-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          filters: newCampaign.filters,
          selectedCustomerIds: newCampaign.selectedCustomerIds 
        }),
      });
      const data = await res.json();
      setPreviewResults(data);
    } catch (error) {
      console.error("Error previewing filters:", error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenCampaign = async (campaign) => {
    setEditingCampaign(campaign);
    
    let customers = [];
    if (campaign.selectedCustomerIds?.length > 0) {
      try {
        const promises = campaign.selectedCustomerIds.map((id) =>
          fetch(`/api/customers/${id}`).then((r) => r.json())
        );
        customers = await Promise.all(promises);
      } catch (e) {
        console.error("Error loading customers:", e);
      }
    }
    setSelectedCustomers(customers);
    
    setNewCampaign({
      name: campaign.name || "",
      brief: campaign.brief || "",
      filters: campaign.filters || [],
      selectedCustomerIds: campaign.selectedCustomerIds || [],
      sendEmail: campaign.sendEmail !== false,
      emailSendDate: campaign.emailSendDate ? new Date(campaign.emailSendDate).toISOString().split("T")[0] : "",
      emailSendTime: campaign.emailSendTime || "10:00",
      emailSubject: campaign.emailSubject || "",
      emailBody: campaign.emailBody || "",
      sendCall: campaign.sendCall !== false,
      followUpDelayDays: campaign.followUpDelayDays || 3,
      callSendDate: campaign.callSendDate ? new Date(campaign.callSendDate).toISOString().split("T")[0] : "",
      callSendTime: campaign.callSendTime || "10:00",
      callScript: campaign.callScript || "",
      callRetryCount: campaign.callRetryCount ?? 2,
    });
    setSelectedPreset(null);
    setDialogOpen(true);
  };

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    setNewCampaign(getDefaultCampaign());
    setSelectedCustomers([]);
    setSelectedPreset("all");
    setPreviewResults(null);
    setDialogOpen(true);
  };

  const handleCreateCampaign = async () => {
    try {
      const url = editingCampaign ? `/api/campaigns/${editingCampaign.id}` : "/api/campaigns";
      const method = editingCampaign ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      });
      
      if (res.ok) {
        setDialogOpen(false);
        setEditingCampaign(null);
        setNewCampaign(getDefaultCampaign());
        setSelectedCustomers([]);
        setPreviewResults(null);
        setSelectedPreset("all");
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const getFieldType = (fieldValue) => {
    const field = FILTER_FIELDS.find((f) => f.value === fieldValue);
    return field?.type || "text";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "default";
      case "active": return "primary";
      case "sent": return "success";
      case "completed": return "info";
      default: return "default";
    }
  };

  const formatCount = (num) => num?.toLocaleString() || "0";

  const getTotalRecipients = () => {
    if (previewResults?.count) {
      return previewResults.count;
    }
    if (selectedCustomers.length > 0) {
      return selectedCustomers.length;
    }
    return 0;
  };

  const getCampaignSummary = () => {
    const recipients = getTotalRecipients();
    if (recipients === 0) return null;
    
    const parts = [];
    
    if (newCampaign.sendEmail && newCampaign.emailSendDate) {
      const date = new Date(newCampaign.emailSendDate).toLocaleDateString("en-US", { 
        weekday: "short", month: "short", day: "numeric" 
      });
      const time = SEND_TIMES.find((t) => t.value === newCampaign.emailSendTime)?.label || newCampaign.emailSendTime;
      parts.push(`Email ${recipients} customer${recipients !== 1 ? "s" : ""} on ${date} at ${time}`);
    }
    
    if (newCampaign.sendCall) {
      if (newCampaign.sendEmail) {
        parts.push(`AI calls ${newCampaign.followUpDelayDays} day${newCampaign.followUpDelayDays !== 1 ? "s" : ""} later if no response`);
      } else {
        parts.push(`AI calls ${recipients} customer${recipients !== 1 ? "s" : ""}`);
      }
    }
    
    return parts.join(". ") + ".";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Marketing Campaigns</Typography>
        <Button variant="contained" onClick={handleNewCampaign}>
          New Campaign
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No campaigns yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Create your first marketing campaign to reach out to customers
            </Typography>
            <Button variant="contained" onClick={handleNewCampaign}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Campaign Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Recipients</TableCell>
                <TableCell align="center">Sent</TableCell>
                <TableCell align="center">Opened</TableCell>
                <TableCell align="center">Booked</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow 
                  key={campaign.id} 
                  hover 
                  onClick={() => handleOpenCampaign(campaign)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography fontWeight="medium">{campaign.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={campaign.status} size="small" color={getStatusColor(campaign.status)} />
                  </TableCell>
                  <TableCell align="center">{formatCount(campaign.totalRecipients)}</TableCell>
                  <TableCell align="center">{formatCount(campaign.sentCount)}</TableCell>
                  <TableCell align="center">{formatCount(campaign.openedCount)}</TableCell>
                  <TableCell align="center">{formatCount(campaign.bookedCount)}</TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "70vh" }}>
          <TextField
            fullWidth
            label="Campaign Name"
            value={newCampaign.name}
            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="e.g., Spring Cleaning Special"
          />

          <TextField
            fullWidth
            label="Campaign Brief"
            value={newCampaign.brief}
            onChange={(e) => setNewCampaign({ ...newCampaign, brief: e.target.value })}
            sx={{ mb: 1 }}
            placeholder="Describe the campaign goal... e.g., Win back customers who haven't booked in 6 months with a 15% spring discount"
            multiline
            rows={2}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              AI will use this to generate your email and call script
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={aiGenerating ? <CircularProgress size={16} /> : <AutoAwesome />}
              onClick={handleGenerateWithAI}
              disabled={aiGenerating || !newCampaign.brief || newCampaign.brief.trim().length < 10}
            >
              {aiGenerating ? "Generating..." : "Generate with AI"}
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mb: 2 }}>Who should receive this?</Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Search for specific customers
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} fontSize="small" />,
              }}
              sx={{ mb: 1 }}
            />
            
            {customerSearchLoading && <CircularProgress size={20} sx={{ ml: 1 }} />}
            
            {customerSearchResults.length > 0 && (
              <Paper elevation={2} sx={{ mt: 1, maxHeight: 200, overflow: "auto" }}>
                {customerSearchResults.map((customer) => (
                  <Box
                    key={customer.id}
                    sx={{
                      p: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                    onClick={() => handleAddCustomer(customer)}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {customer.firstName} {customer.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {customer.email} • {customer.phone}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}

            {selectedCustomers.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Selected customers:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {selectedCustomers.map((customer) => (
                    <Chip
                      key={customer.id}
                      label={`${customer.firstName} ${customer.lastName}`}
                      onDelete={() => handleRemoveCustomer(customer.id)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Or select a customer group
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              {FILTER_PRESETS.map((preset) => (
                <Chip
                  key={preset.id}
                  label={preset.label}
                  onClick={() => handleSelectPreset(preset)}
                  color={selectedPreset === preset.id ? "primary" : "default"}
                  variant={selectedPreset === preset.id ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            {newCampaign.filters.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {newCampaign.filters.map((filter, index) => (
                  <Grid container spacing={1} key={index} sx={{ mb: 1 }} alignItems="center">
                    <Grid item xs={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={filter.field}
                          label="Field"
                          onChange={(e) => handleFilterChange(index, "field", e.target.value)}
                        >
                          {FILTER_FIELDS.map((f) => (
                            <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={3}>
                      <FormControl fullWidth size="small" disabled={!filter.field}>
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={filter.operator}
                          label="Operator"
                          onChange={(e) => handleFilterChange(index, "operator", e.target.value)}
                        >
                          {filter.field &&
                            OPERATORS[getFieldType(filter.field)]?.map((op) => (
                              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      {getFieldType(filter.field) === "boolean" ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Value</InputLabel>
                          <Select
                            value={filter.value}
                            label="Value"
                            onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                          >
                            <MenuItem value="true">Yes</MenuItem>
                            <MenuItem value="false">No</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          type={getFieldType(filter.field) === "number" ? "number" : getFieldType(filter.field) === "date" ? "date" : "text"}
                          value={filter.value}
                          onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                          InputLabelProps={getFieldType(filter.field) === "date" ? { shrink: true } : {}}
                        />
                      )}
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton color="error" onClick={() => handleRemoveFilter(index)} size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Button variant="outlined" size="small" onClick={handleAddFilter}>
                + Add Custom Filter
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handlePreviewFilters}
                disabled={previewLoading}
              >
                {previewLoading ? "Loading..." : "Count Matches"}
              </Button>
            </Box>

            {previewResults && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>{formatCount(previewResults.count)} customers</strong> match these filters
              </Alert>
            )}
          </Paper>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>Campaign Sequence</Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Chip label="Step 1" size="small" color="primary" sx={{ mr: 2 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newCampaign.sendEmail}
                    onChange={(e) => setNewCampaign({ ...newCampaign, sendEmail: e.target.checked })}
                  />
                }
                label={<Typography fontWeight="medium">Send Email</Typography>}
              />
            </Box>
            
            {newCampaign.sendEmail && (
              <Box sx={{ ml: 4 }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Send Date"
                      type="date"
                      size="small"
                      value={newCampaign.emailSendDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, emailSendDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Send Time</InputLabel>
                      <Select
                        value={newCampaign.emailSendTime}
                        label="Send Time"
                        onChange={(e) => setNewCampaign({ ...newCampaign, emailSendTime: e.target.value })}
                      >
                        {SEND_TIMES.map((t) => (
                          <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="Email Subject"
                  value={newCampaign.emailSubject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, emailSubject: e.target.value })}
                  sx={{ mb: 2 }}
                  size="small"
                  placeholder="e.g., Time for your Spring Cleaning!"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Email Body"
                  value={newCampaign.emailBody}
                  onChange={(e) => setNewCampaign({ ...newCampaign, emailBody: e.target.value })}
                  size="small"
                  placeholder="Write your email message here..."
                  helperText="Use {{first_name}}, {{last_name}}, {{city}}, {{company_name}} for personalization"
                />
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Chip label="Step 2" size="small" color="secondary" sx={{ mr: 2 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newCampaign.sendCall}
                    onChange={(e) => setNewCampaign({ ...newCampaign, sendCall: e.target.checked })}
                  />
                }
                label={<Typography fontWeight="medium">AI Follow-up Call</Typography>}
              />
            </Box>
            
            {newCampaign.sendCall && (
              <Box sx={{ ml: 4 }}>
                {newCampaign.sendEmail ? (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Call if no response after:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Slider
                        value={newCampaign.followUpDelayDays}
                        onChange={(e, val) => setNewCampaign({ ...newCampaign, followUpDelayDays: val })}
                        min={1}
                        max={7}
                        marks
                        step={1}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 60 }}>
                        {newCampaign.followUpDelayDays} day{newCampaign.followUpDelayDays !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <TextField
                      type="date"
                      label="Call Date"
                      value={newCampaign.callSendDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, callSendDate: e.target.value })}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Call Time</InputLabel>
                      <Select
                        value={newCampaign.callSendTime}
                        label="Call Time"
                        onChange={(e) => setNewCampaign({ ...newCampaign, callSendTime: e.target.value })}
                      >
                        {SEND_TIMES.map((t) => (
                          <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Retry attempts if no answer:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Slider
                      value={newCampaign.callRetryCount}
                      onChange={(e, val) => setNewCampaign({ ...newCampaign, callRetryCount: val })}
                      min={0}
                      max={5}
                      marks
                      step={1}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      {newCampaign.callRetryCount} retr{newCampaign.callRetryCount !== 1 ? "ies" : "y"}
                    </Typography>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Call Script"
                  value={newCampaign.callScript}
                  onChange={(e) => setNewCampaign({ ...newCampaign, callScript: e.target.value })}
                  size="small"
                  placeholder="Hi {{first_name}}, this is Sarah from {{company_name}}..."
                  helperText="Use {{first_name}}, {{last_name}}, {{city}}, {{company_name}} for personalization"
                />
              </Box>
            )}
          </Paper>

          {getCampaignSummary() && (
            <Alert severity="success" sx={{ mt: 3 }} icon={false}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Campaign Summary</Typography>
              <Typography variant="body2">{getCampaignSummary()}</Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaign}
            disabled={!newCampaign.name || (getTotalRecipients() === 0 && selectedPreset !== "all")}
          >
            {editingCampaign ? "Save Campaign" : "Create Campaign"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
