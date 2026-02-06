"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Pagination,
  Button,
  Avatar,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Verified as VerifiedIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  Star as StarIcon,
} from "@mui/icons-material";

function CustomerCard({ customer, onClick }) {
  const initials = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}`.toUpperCase();
  const lifetimeValue = parseFloat(customer.lifetimeSpend || 0);
  const transactionCount = customer.transactionCount || 0;
  
  let tierColor = "#6B7280";
  let tierLabel = "New";
  if (lifetimeValue >= 5000) {
    tierColor = "#F59E0B";
    tierLabel = "Gold";
  } else if (lifetimeValue >= 2000) {
    tierColor = "#8B5CF6";
    tierLabel = "Silver";
  } else if (lifetimeValue >= 500) {
    tierColor = "#10B981";
    tierLabel = "Bronze";
  }
  
  return (
    <Card
      sx={{
        height: "100%",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: tierColor,
                fontSize: "1.25rem",
                fontWeight: "bold",
              }}
            >
              {initials || "?"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight="bold" noWrap>
                  {customer.firstName} {customer.lastName}
                </Typography>
                {customer.hasSeasonPass && (
                  <Tooltip title="Season Pass Holder">
                    <VerifiedIcon sx={{ color: "#10B981", fontSize: 18 }} />
                  </Tooltip>
                )}
              </Box>
              {customer.companyName && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {customer.companyName}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Chip
                  label={tierLabel}
                  size="small"
                  sx={{
                    bgcolor: tierColor,
                    color: "#fff",
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  }}
                />
                {customer.isBlockedFromOnlineBooking && (
                  <Chip label="Blocked" size="small" color="error" sx={{ height: 20, fontSize: "0.7rem" }} />
                )}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
            {customer.phone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" noWrap>{customer.phone}</Typography>
              </Box>
            )}
            {customer.email && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" noWrap>{customer.email}</Typography>
              </Box>
            )}
            {customer.city && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" noWrap>{customer.city}</Typography>
              </Box>
            )}
          </Box>
          
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="primary.main">
                ${lifetimeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lifetime
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold">
                {transactionCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Visits
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color={customer.windowsPrice ? "success.main" : "text.secondary"}>
                {customer.windowsPrice ? `$${parseFloat(customer.windowsPrice).toFixed(0)}` : "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Windows
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color={customer.eavesPrice ? "success.main" : "text.secondary"}>
                {customer.eavesPrice ? `$${parseFloat(customer.eavesPrice).toFixed(0)}` : "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Eaves
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  
  useEffect(() => {
    fetch("/api/cities")
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(console.error);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "24",
        search,
      });
      if (filter === "seasonpass") params.append("seasonPass", "true");
      if (city) params.append("city", city);
      
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, filter, city]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };
  
  const handleFilterChange = (event, newValue) => {
    setFilter(newValue);
    setPage(1);
  };

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Customers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total.toLocaleString()} total customers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/customers/new")}
          sx={{ borderRadius: 2 }}
        >
          Add Customer
        </Button>
      </Box>
      
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, email, phone, or address..."
                value={search}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Tabs
                value={filter}
                onChange={handleFilterChange}
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": { minHeight: 40, py: 0 },
                }}
              >
                <Tab label="All" value="all" />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <VerifiedIcon sx={{ fontSize: 16 }} />
                      Season Pass
                    </Box>
                  }
                  value="seasonpass"
                />
              </Tabs>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>City</InputLabel>
                <Select
                  value={city}
                  label="City"
                  onChange={(e) => { setCity(e.target.value); setPage(1); }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Cities</MenuItem>
                  {cities.map((c) => (
                    <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <BrandLoader />
        </Box>
      ) : customers.length > 0 ? (
        <>
          <Grid container spacing={2}>
            {customers.map((customer) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={customer.id}>
                <CustomerCard
                  customer={customer}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                />
              </Grid>
            ))}
          </Grid>
          
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, p) => setPage(p)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      ) : (
        <Card sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary" variant="h6">
            No customers found
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            Try adjusting your search or filters
          </Typography>
        </Card>
      )}
    </Content>
  );
}
