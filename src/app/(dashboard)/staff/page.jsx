"use client";

import { useState, useEffect } from "react";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Button,
  LinearProgress,
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
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Close as CloseIcon, AccessTime as HourlyIcon, Percent as CommissionIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import BrandLoader from "@/components/BrandLoader";

function getLevelFromXP(xp) {
  return Math.floor(xp / 1000) + 1;
}

function getXPProgress(xp) {
  return (xp % 1000) / 10;
}

const initialFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "service_provider",
  crewId: "",
  isActive: true,
  payType: "hourly",
  payRate: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaff(data);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      setStaff([]);
    }
  };

  const fetchCrews = async () => {
    try {
      const res = await fetch("/api/crews");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCrews(data);
      } else {
        setCrews([]);
      }
    } catch (err) {
      console.error("Error fetching crews:", err);
      setCrews([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchStaff(), fetchCrews()]).finally(() => setLoading(false));
  }, []);

  const handleAddClick = () => {
    setDialogMode("add");
    setSelectedStaff(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleEditClick = (member) => {
    setDialogMode("edit");
    setSelectedStaff(member);
    setFormData({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
      password: "",
      role: member.role || "service_provider",
      crewId: member.crews?.[0]?.crewId || "",
      isActive: member.isActive !== false,
      payType: member.payType || "hourly",
      payRate: member.payRate || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStaff(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.email.trim()) {
      toast.error("First name and email are required");
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "add") {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password || undefined,
            role: formData.role,
            isActive: formData.isActive,
            payType: formData.payType,
            payRate: formData.payRate ? parseFloat(formData.payRate) : null,
            crewId: formData.crewId || undefined,
          }),
        });

        if (res.ok) {
          toast.success("Staff member created successfully");
          handleCloseDialog();
          fetchStaff();
        } else {
          const error = await res.json();
          toast.error(error.error || "Failed to create staff member");
        }
      } else {
        const res = await fetch(`/api/staff/${selectedStaff.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          toast.success("Staff member updated successfully");
          handleCloseDialog();
          fetchStaff();
        } else {
          toast.error("Failed to update staff member");
        }
      }
    } catch (err) {
      console.error("Error saving staff:", err);
      toast.error("Failed to save staff member");
    }
    setSaving(false);
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
            Staff
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {staff.length} team members
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
          Add Staff
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Crew</TableCell>
                <TableCell>Pay</TableCell>
                <TableCell>Level / XP</TableCell>
                <TableCell>Stats</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No staff members yet. Click &quot;Add Staff&quot; to create one.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => {
                  const level = getLevelFromXP(member.xp || 0);
                  const progress = getXPProgress(member.xp || 0);
                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar src={member.avatarUrl} sx={{ bgcolor: "#3b82f6" }}>
                            {member.firstName?.charAt(0) || "?"}
                          </Avatar>
                          <Box>
                            <Typography fontWeight="medium">
                              {member.firstName} {member.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.role?.replace("_", " ") || "Staff"}
                          size="small"
                          color={member.role === "admin" ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        {member.crews?.length > 0 ? (
                          member.crews.map((c) => (
                            <Chip
                              key={c.id}
                              label={c.crew?.name || "Unknown"}
                              size="small"
                              sx={{ mr: 0.5, bgcolor: c.crew?.color, color: "#fff" }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {member.payType === "commission" ? (
                            <CommissionIcon fontSize="small" color="secondary" />
                          ) : (
                            <HourlyIcon fontSize="small" color="info" />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.payType === "commission" 
                                ? `${parseFloat(member.payRate || 0).toFixed(0)}%` 
                                : `$${parseFloat(member.payRate || 0).toFixed(2)}/hr`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.payType === "commission" ? "Commission" : "Hourly"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            Level {level}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ width: 80, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {member.xp || 0} XP
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {member.stats?.totalJobsCompleted || 0} jobs
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${parseFloat(member.stats?.totalEarnings || 0).toFixed(0)} earned
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={member.isActive ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleEditClick(member)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {dialogMode === "add" ? "Add Staff Member" : "Edit Staff Member"}
          <IconButton size="small" onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                fullWidth
              />
            </Box>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            {dialogMode === "add" && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                helperText="Leave blank to use default password: changeme123"
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="service_provider">Service Provider</MenuItem>
                <MenuItem value="customer_service">Customer Service</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Crew Assignment</InputLabel>
              <Select
                value={formData.crewId}
                label="Crew Assignment"
                onChange={(e) => setFormData({ ...formData, crewId: e.target.value })}
              >
                <MenuItem value="">No Crew</MenuItem>
                {crews.map((crew) => (
                  <MenuItem key={crew.id} value={crew.id}>
                    {crew.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Pay Type</InputLabel>
                <Select
                  value={formData.payType}
                  label="Pay Type"
                  onChange={(e) => setFormData({ ...formData, payType: e.target.value })}
                >
                  <MenuItem value="hourly">Hourly Rate</MenuItem>
                  <MenuItem value="commission">Commission %</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={formData.payType === "commission" ? "Commission %" : "Hourly Rate ($)"}
                type="number"
                value={formData.payRate}
                onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: formData.payType === "hourly" ? <Typography sx={{ mr: 0.5 }}>$</Typography> : null,
                  endAdornment: formData.payType === "commission" ? <Typography sx={{ ml: 0.5 }}>%</Typography> : <Typography sx={{ ml: 0.5 }}>/hr</Typography>,
                }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : dialogMode === "add" ? "Create Staff" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Content>
  );
}
