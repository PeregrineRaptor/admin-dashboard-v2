"use client";

import { useState, useEffect } from "react";
import Content from "@/components/common/Content";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, AccessTime as HourlyIcon, AttachMoney as FlatIcon, Layers as TieredIcon } from "@mui/icons-material";
import BrandLoader from "@/components/BrandLoader";

const formatPrice = (price) => {
  return `$${parseFloat(price || 0).toFixed(2)}`;
};

const getPricingDisplay = (service) => {
  const pricingType = service.pricingType || 'flat_rate';
  
  switch (pricingType) {
    case 'tiered':
      return {
        label: 'Tiered',
        icon: <TieredIcon fontSize="small" />,
        color: 'secondary',
        primary: service.firstHourRate ? `${formatPrice(service.firstHourRate)} first hour` : null,
        secondary: service.additionalHourRate ? `${formatPrice(service.additionalHourRate)}/hr after` : null,
      };
    case 'hourly':
      return {
        label: 'Hourly',
        icon: <HourlyIcon fontSize="small" />,
        color: 'info',
        primary: service.basePrice ? `${formatPrice(service.basePrice)}/hr` : null,
        secondary: null,
      };
    case 'flat_rate':
    default:
      return {
        label: 'Flat Rate',
        icon: <FlatIcon fontSize="small" />,
        color: 'primary',
        primary: service.basePrice ? formatPrice(service.basePrice) : null,
        secondary: null,
      };
  }
};

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error("Unexpected response format:", data);
          setServices([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching services:", err);
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

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Services
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {services.length} services available
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Service
        </Button>
      </Box>

      <Grid container spacing={3}>
        {services.map((service) => {
          const pricing = getPricingDisplay(service);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={service.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {service.name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        <Chip
                          icon={pricing.icon}
                          label={pricing.label}
                          size="small"
                          color={pricing.color}
                          variant="outlined"
                        />
                        <Chip
                          label={service.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={service.isActive ? "success" : "default"}
                        />
                        {service.isPublic && (
                          <Chip label="Public" size="small" color="info" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                    <Button size="small" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                  </Box>

                  {service.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {service.description}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pricing
                      </Typography>
                      {pricing.primary && (
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                          {pricing.primary}
                        </Typography>
                      )}
                      {pricing.secondary && (
                        <Typography variant="body2" color="text.secondary">
                          {pricing.secondary}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {service.durationMinutes || 45} min
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Content>
  );
}
