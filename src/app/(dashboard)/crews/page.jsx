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
  Avatar,
  AvatarGroup,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  IconButton,
  Autocomplete,
  Paper,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Close as CloseIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import BrandLoader from "@/components/BrandLoader";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function CrewsPage() {
  const [crews, setCrews] = useState([]);
  const [services, setServices] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    maxDailyProduction: "2000",
    workingDays: [1, 2, 3, 4, 5],
    serviceIds: [],
    memberIds: [],
    citySchedules: [],
  });
  const [saving, setSaving] = useState(false);
  const [selectedCityToAdd, setSelectedCityToAdd] = useState(null);

  const fetchCrews = async () => {
    try {
      const res = await fetch("/api/crews");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCrews(data);
      } else {
        console.error("Unexpected crews response:", data);
        setCrews([]);
      }
    } catch (err) {
      console.error("Error fetching crews:", err);
      setCrews([]);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setServices([]);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setAllStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setAllStaff([]);
    }
  };

  const fetchAllCities = async () => {
    try {
      const res = await fetch("/api/cities");
      const data = await res.json();
      setAllCities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching cities:", err);
      setAllCities([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchCrews(), fetchServices(), fetchAllStaff(), fetchAllCities()]).finally(() => setLoading(false));
  }, []);

  const handleEditClick = async (crew) => {
    try {
      const [crewRes, schedulesRes] = await Promise.all([
        fetch(`/api/crews/${crew.id}`),
        fetch(`/api/crews/${crew.id}/schedules`),
      ]);
      const fullCrew = await crewRes.json();
      const schedules = await schedulesRes.json();
      
      setSelectedCrew(fullCrew);
      setFormData({
        name: fullCrew.name || "",
        color: fullCrew.color || "#3B82F6",
        maxDailyProduction: fullCrew.maxDailyProduction || "2000",
        workingDays: fullCrew.workingDays || [1, 2, 3, 4, 5],
        serviceIds: fullCrew.services?.map((s) => s.id) || [],
        memberIds: fullCrew.members?.map((m) => m.userId) || [],
        citySchedules: Array.isArray(schedules) ? schedules : [],
      });
      setSelectedCityToAdd(null);
      setEditDialogOpen(true);
    } catch (err) {
      console.error("Error fetching crew details:", err);
      toast.error("Failed to load crew details");
    }
  };

  const handleWorkingDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort((a, b) => a - b),
    }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  const handleMemberToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  };

  const handleAddCity = () => {
    if (!selectedCityToAdd) return;
    const alreadyAdded = formData.citySchedules.some(cs => cs.cityId === selectedCityToAdd.id);
    if (alreadyAdded) {
      toast.error("City already added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      citySchedules: [
        ...prev.citySchedules,
        { cityId: selectedCityToAdd.id, cityName: selectedCityToAdd.name, days: [1, 2, 3, 4, 5] },
      ],
    }));
    setSelectedCityToAdd(null);
  };

  const handleRemoveCity = (cityId) => {
    setFormData((prev) => ({
      ...prev,
      citySchedules: prev.citySchedules.filter(cs => cs.cityId !== cityId),
    }));
  };

  const handleCityDayToggle = (cityId, day) => {
    setFormData((prev) => ({
      ...prev,
      citySchedules: prev.citySchedules.map(cs => {
        if (cs.cityId !== cityId) return cs;
        const newDays = cs.days.includes(day)
          ? cs.days.filter(d => d !== day)
          : [...cs.days, day].sort((a, b) => a - b);
        return { ...cs, days: newDays };
      }),
    }));
  };

  const handleSave = async () => {
    if (!selectedCrew) return;
    setSaving(true);
    try {
      const [crewRes, schedulesRes] = await Promise.all([
        fetch(`/api/crews/${selectedCrew.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            color: formData.color,
            maxDailyProduction: formData.maxDailyProduction,
            workingDays: formData.workingDays,
            serviceIds: formData.serviceIds,
            memberIds: formData.memberIds,
          }),
        }),
        fetch(`/api/crews/${selectedCrew.id}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            citySchedules: formData.citySchedules,
          }),
        }),
      ]);
      
      if (crewRes.ok && schedulesRes.ok) {
        toast.success("Crew updated successfully");
        setEditDialogOpen(false);
        fetchCrews();
      } else {
        toast.error("Failed to update crew");
      }
    } catch (err) {
      console.error("Error updating crew:", err);
      toast.error("Failed to update crew");
    } finally {
      setSaving(false);
    }
  };

  const formatWorkingDays = (days) => {
    if (!days || days.length === 0) return "No days set";
    if (days.length === 7) return "Every day";
    if (JSON.stringify(days.sort((a, b) => a - b)) === JSON.stringify([1, 2, 3, 4, 5])) return "Weekdays";
    if (JSON.stringify(days.sort((a, b) => a - b)) === JSON.stringify([0, 6])) return "Weekends";
    return days.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.slice(0, 3)).join(", ");
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
            Crews
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {crews.length} crews configured
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Crew
        </Button>
      </Box>

      <Grid container spacing={3}>
        {crews.map((crew) => (
          <Grid item xs={12} md={6} lg={4} key={crew.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: crew.color, width: 48, height: 48, fontWeight: "bold" }}>
                      {crew.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {crew.name}
                      </Typography>
                      <Chip
                        label={crew.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={crew.isActive ? "success" : "default"}
                      />
                    </Box>
                  </Box>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(crew)}>
                    Edit
                  </Button>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Max Daily Production
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    ${parseFloat(crew.maxDailyProduction || 0).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Working Days
                  </Typography>
                  <Typography variant="body1">
                    {formatWorkingDays(crew.workingDays)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Team Members ({crew.members?.length || 0})
                </Typography>
                {crew.members?.length > 0 ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <AvatarGroup max={4}>
                      {crew.members.map((member) => (
                        <Avatar
                          key={member.id}
                          sx={{ width: 32, height: 32, bgcolor: crew.color }}
                        >
                          {member.user?.firstName?.charAt(0) || "?"}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Typography variant="body2">
                      {crew.members.map((m) => m.user?.firstName).filter(Boolean).join(", ")}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No members assigned
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Services ({crew.services?.length || 0})
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                  {crew.services?.slice(0, 3).map((service) => (
                    <Chip
                      key={service.id}
                      label={service.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {(crew.services?.length || 0) > 3 && (
                    <Chip
                      label={`+${crew.services.length - 3} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {(!crew.services || crew.services.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      All services
                    </Typography>
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  City Schedule ({crew.citySchedules?.length || 0} cities)
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {crew.citySchedules?.slice(0, 5).map((schedule) => (
                    <Chip
                      key={schedule.id}
                      label={`${schedule.city?.name || "Unknown"} - ${DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)?.label.slice(0, 3) || schedule.dayOfWeek}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {(crew.citySchedules?.length || 0) > 5 && (
                    <Chip
                      label={`+${crew.citySchedules.length - 5} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {(!crew.citySchedules || crew.citySchedules.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      No cities scheduled
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Edit Crew
          <IconButton onClick={() => setEditDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <TextField
              label="Crew Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Max Daily Production ($)"
                type="number"
                value={formData.maxDailyProduction}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxDailyProduction: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                sx={{ width: 100 }}
                InputProps={{ sx: { height: 56 } }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Working Days
              </Typography>
              <FormGroup row>
                {DAYS_OF_WEEK.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={formData.workingDays.includes(day.value)}
                        onChange={() => handleWorkingDayToggle(day.value)}
                      />
                    }
                    label={day.label.slice(0, 3)}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Team Members
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select staff members assigned to this crew.
              </Typography>
              <FormGroup>
                {allStaff.filter(s => s.role === "service_provider").map((staff) => (
                  <FormControlLabel
                    key={staff.id}
                    control={
                      <Checkbox
                        checked={formData.memberIds.includes(staff.id)}
                        onChange={() => handleMemberToggle(staff.id)}
                      />
                    }
                    label={`${staff.firstName} ${staff.lastName}`}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Services This Crew Can Perform
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Leave empty to allow all services, or select specific services this crew specializes in.
              </Typography>
              <FormGroup>
                {services.map((service) => (
                  <FormControlLabel
                    key={service.id}
                    control={
                      <Checkbox
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                      />
                    }
                    label={service.name}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                City Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assign which cities this crew works in on which days.
              </Typography>
              
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Autocomplete
                  size="small"
                  options={allCities.filter(c => !c.parentId && !formData.citySchedules.some(cs => cs.cityId === c.id))}
                  getOptionLabel={(option) => option.name}
                  value={selectedCityToAdd}
                  onChange={(_, value) => setSelectedCityToAdd(value)}
                  renderInput={(params) => <TextField {...params} placeholder="Add a city..." />}
                  sx={{ flex: 1 }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddCity} 
                  disabled={!selectedCityToAdd}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>

              {formData.citySchedules.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {formData.citySchedules.map((citySchedule) => (
                    <Paper key={citySchedule.cityId} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2">{citySchedule.cityName}</Typography>
                        <IconButton size="small" onClick={() => handleRemoveCity(citySchedule.cityId)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {DAYS_OF_WEEK.map((day) => (
                          <Chip
                            key={day.value}
                            label={day.label.slice(0, 3)}
                            size="small"
                            color={citySchedule.days.includes(day.value) ? "primary" : "default"}
                            variant={citySchedule.days.includes(day.value) ? "filled" : "outlined"}
                            onClick={() => handleCityDayToggle(citySchedule.cityId, day.value)}
                            sx={{ cursor: "pointer" }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No cities assigned. Add cities above to set which days this crew works in each city.
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Content>
  );
}
