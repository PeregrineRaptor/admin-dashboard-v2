"use client";

import { useState, useEffect } from "react";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Sync as SyncIcon,
  MergeType as MergeIcon,
  SubdirectoryArrowRight as SubIcon,
} from "@mui/icons-material";
import BrandLoader from "@/components/BrandLoader";

export default function CitiesPage() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData, setFormData] = useState({ name: "", province: "Ontario", parentId: null, isActive: true });
  const [syncing, setSyncing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cities?active=false");
      const data = await res.json();
      setCities(data);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
    setLoading(false);
  };

  const checkDuplicates = async () => {
    try {
      const res = await fetch("/api/cities/merge-duplicates");
      const data = await res.json();
      setDuplicateCount(data.totalDuplicateRecords || 0);
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!confirm(`This will merge ${duplicateCount} duplicate city records. Continue?`)) return;
    setMerging(true);
    try {
      const res = await fetch("/api/cities/merge-duplicates", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`Merged ${data.mergedGroups} duplicate groups, deleted ${data.deletedRecords} records. ${data.remainingCities} cities remaining.`);
        setDuplicateCount(0);
        fetchCities();
      } else {
        alert("Failed to merge: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error merging duplicates:", error);
      alert("Failed to merge duplicates");
    }
    setMerging(false);
  };

  useEffect(() => {
    fetchCities();
    checkDuplicates();
  }, []);

  const handleOpenDialog = (city = null) => {
    if (city) {
      setEditingCity(city);
      setFormData({ name: city.name, province: city.province || "Ontario", parentId: city.parentId || null, isActive: city.isActive });
    } else {
      setEditingCity(null);
      setFormData({ name: "", province: "Ontario", parentId: null, isActive: true });
    }
    setDialogOpen(true);
  };

  const parentCities = cities.filter(c => !c.parentId);
  
  const getParentName = (parentId) => {
    const parent = cities.find(c => c.id === parentId);
    return parent ? parent.name : null;
  };

  const organizedCities = () => {
    const parents = filteredCities.filter(c => !c.parentId);
    const children = filteredCities.filter(c => c.parentId);
    
    const result = [];
    parents.forEach(parent => {
      result.push(parent);
      children.filter(c => c.parentId === parent.id).forEach(child => {
        result.push({ ...child, isChild: true });
      });
    });
    
    children.filter(c => !parents.find(p => p.id === c.parentId)).forEach(orphan => {
      result.push({ ...orphan, isChild: true });
    });
    
    return result;
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCity(null);
  };

  const handleSave = async () => {
    try {
      if (editingCity) {
        await fetch(`/api/cities/${editingCity.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      handleCloseDialog();
      fetchCities();
      checkDuplicates();
    } catch (error) {
      console.error("Error saving city:", error);
    }
  };

  const handleSyncCities = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/cities/sync", { method: "POST" });
      const data = await res.json();
      if (data.added > 0) {
        alert(`Synced ${data.added} new cities from customer addresses!`);
      } else {
        alert("All cities are already in the system.");
      }
      fetchCities();
      checkDuplicates();
    } catch (error) {
      console.error("Error syncing cities:", error);
      alert("Failed to sync cities");
    }
    setSyncing(false);
  };

  const filteredCities = cities.filter(
    (city) =>
      city.name?.toLowerCase().includes(search.toLowerCase()) ||
      city.province?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Cities
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cities.length} cities in the system
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          {duplicateCount > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={merging ? <BrandLoader size={20} /> : <MergeIcon />}
              onClick={handleMergeDuplicates}
              disabled={merging}
            >
              {merging ? "Merging..." : `Merge ${duplicateCount} Duplicates`}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={syncing ? <BrandLoader size={20} /> : <SyncIcon />}
            onClick={handleSyncCities}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync from Customers"}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add City
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <BrandLoader />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>City Name</TableCell>
                  <TableCell>Parent City</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizedCities().length > 0 ? (
                  organizedCities().map((city) => (
                    <TableRow key={city.id} hover sx={city.isChild ? { bgcolor: 'action.hover' } : {}}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {city.isChild && <SubIcon fontSize="small" color="action" sx={{ ml: 2 }} />}
                          <Typography fontWeight={city.isChild ? "normal" : "medium"}>
                            {city.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {city.parentId ? (
                          <Chip label={getParentName(city.parentId)} size="small" variant="outlined" />
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>{city.province || "Ontario"}</TableCell>
                      <TableCell>
                        <Chip
                          label={city.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={city.isActive ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(city)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No cities found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCity ? "Edit City" : "Add City"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="City Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Parent City (optional)</InputLabel>
              <Select
                value={formData.parentId || ""}
                label="Parent City (optional)"
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
              >
                <MenuItem value="">
                  <em>None - This is a main city</em>
                </MenuItem>
                {parentCities
                  .filter(c => c.id !== editingCity?.id)
                  .map(city => (
                    <MenuItem key={city.id} value={city.id}>
                      {city.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Sub-cities are automatically covered when a crew is scheduled for the parent city.
            </Typography>
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
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingCity ? "Save Changes" : "Add City"}
          </Button>
        </DialogActions>
      </Dialog>
    </Content>
  );
}
