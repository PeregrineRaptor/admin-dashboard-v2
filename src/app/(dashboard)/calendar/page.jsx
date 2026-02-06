"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Content from "@/components/common/Content";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Chip,
  Grid,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  ViewWeek,
  ViewDay,
  Add,
  Print,
} from "@mui/icons-material";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getBookingColor(booking, crews) {
  if (booking.crew?.color) return booking.crew.color;
  const defaultColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
  return defaultColors[booking.id % defaultColors.length];
}

function MonthView({ currentDate, bookings, crews, onDateClick, onBookingClick }) {
  const theme = useTheme();
  
  const calendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const weeks = [];
    let days = [];
    
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = new Date(year, month, -startDay + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }
    
    if (days.length > 0) {
      let nextDay = 1;
      while (days.length < 7) {
        days.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false });
      }
      weeks.push(days);
    }
    
    return weeks;
  }, [currentDate]);
  
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const date = b.scheduledDate;
      if (!map[date]) map[date] = [];
      map[date].push(b);
    });
    return map;
  }, [bookings]);
  
  const productionByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const date = b.scheduledDate;
      if (!map[date]) map[date] = 0;
      let total = parseFloat(b.totalAmount) || parseFloat(b.subtotal) || 0;
      if (total === 0 && b.services?.length > 0) {
        total = b.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      }
      map[date] += total;
    });
    return map;
  }, [bookings]);
  
  const today = new Date().toISOString().split("T")[0];
  
  const formatShortName = (booking) => {
    const firstName = booking.customer?.firstName || "";
    const lastName = booking.customer?.lastName || "";
    return `${firstName} ${lastName}`.trim() || "Customer";
  };
  
  return (
    <Box>
      <Grid container sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
          <Grid item xs={12 / 7} key={day} sx={{ py: 1.5, textAlign: "center" }}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      
      {calendar.map((week, weekIdx) => (
        <Grid container key={weekIdx} sx={{ minHeight: 140, borderBottom: 1, borderColor: "divider" }}>
          {week.map(({ date, isCurrentMonth }, dayIdx) => {
            const dateStr = date.toISOString().split("T")[0];
            const dayBookings = bookingsByDate[dateStr] || [];
            const dayProduction = productionByDate[dateStr] || 0;
            const isToday = dateStr === today;
            
            return (
              <Grid
                item
                xs={12 / 7}
                key={dayIdx}
                onClick={() => onDateClick(date)}
                sx={{
                  p: 0.5,
                  borderRight: dayIdx < 6 ? 1 : 0,
                  borderColor: "divider",
                  bgcolor: isCurrentMonth ? "background.paper" : "action.hover",
                  opacity: isCurrentMonth ? 1 : 0.5,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  minHeight: 140,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isToday ? "bold" : "normal",
                      color: isToday ? "primary.contrastText" : isCurrentMonth ? "text.primary" : "text.disabled",
                      bgcolor: isToday ? "primary.main" : "transparent",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    {date.getDate()}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: dayProduction > 0 ? "text.primary" : "text.disabled",
                      fontWeight: dayProduction > 0 ? 600 : 400,
                      fontSize: "0.7rem",
                    }}
                  >
                    ${dayProduction.toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 0.25 }}>
                  {dayBookings.slice(0, 4).map(booking => (
                    <Box
                      key={booking.id}
                      onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
                      sx={{
                        bgcolor: getBookingColor(booking, crews),
                        color: "#fff",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: "0.65rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        "&:hover": { opacity: 0.85 },
                      }}
                    >
                      {formatShortName(booking)}
                    </Box>
                  ))}
                  {dayBookings.length > 4 && (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, fontSize: "0.6rem" }}>
                      +{dayBookings.length - 4} more
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      ))}
    </Box>
  );
}

function WeekView({ currentDate, bookings, crews, onBookingClick }) {
  const weekDates = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);
  
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const date = b.scheduledDate;
      if (!map[date]) map[date] = [];
      map[date].push(b);
    });
    return map;
  }, [bookings]);
  
  const productionByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const date = b.scheduledDate;
      if (!map[date]) map[date] = 0;
      let total = parseFloat(b.totalAmount) || parseFloat(b.subtotal) || 0;
      if (total === 0 && b.services?.length > 0) {
        total = b.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      }
      map[date] += total;
    });
    return map;
  }, [bookings]);
  
  const today = new Date().toISOString().split("T")[0];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const formatShortName = (booking) => {
    const firstName = booking.customer?.firstName || "";
    const lastName = booking.customer?.lastName || "";
    return `${firstName} ${lastName}`.trim() || "Customer";
  };
  
  return (
    <Box sx={{ overflow: "auto" }}>
      <Grid container sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Grid item sx={{ width: 60, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
        {weekDates.map((date, idx) => {
          const dateStr = date.toISOString().split("T")[0];
          const isToday = dateStr === today;
          const dayProduction = productionByDate[dateStr] || 0;
          
          return (
            <Grid item key={idx} xs sx={{ textAlign: "center", py: 1, borderRight: idx < 6 ? 1 : 0, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {DAY_NAMES[date.getDay()]} {date.getMonth() + 1}/{date.getDate().toString().padStart(2, "0")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: dayProduction > 0 ? "text.primary" : "text.disabled",
                }}
              >
                ${dayProduction.toFixed(0)}
              </Typography>
            </Grid>
          );
        })}
      </Grid>
      
      <Box sx={{ display: "flex", borderBottom: 2, borderColor: "divider", bgcolor: "action.hover", minHeight: 50 }}>
        <Box sx={{ 
          width: 60, 
          flexShrink: 0, 
          borderRight: 1, 
          borderColor: "divider",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          pt: 1,
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">All Day</Typography>
        </Box>
        {weekDates.map((date, idx) => {
          const dateStr = date.toISOString().split("T")[0];
          const dayBookings = bookingsByDate[dateStr] || [];
          const allDayBookings = dayBookings.filter(b => !b.startTime || b.startTime === "00:00" || b.startTime === "00:00:00");
          
          return (
            <Box 
              key={idx} 
              sx={{ 
                flex: 1,
                borderRight: idx < 6 ? 1 : 0, 
                borderColor: "divider",
                p: 0.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 0.25,
                overflow: "hidden",
              }}
            >
              {allDayBookings.slice(0, 3).map(booking => (
                <Chip
                  key={booking.id}
                  label={formatShortName(booking)}
                  size="small"
                  onClick={() => onBookingClick(booking)}
                  sx={{
                    bgcolor: getBookingColor(booking, crews),
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: "0.6rem",
                    height: 18,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.85 },
                    "& .MuiChip-label": { px: 0.5, overflow: "hidden", textOverflow: "ellipsis" },
                    borderRadius: 0.5,
                    maxWidth: "100%",
                  }}
                />
              ))}
              {allDayBookings.length > 3 && (
                <Typography variant="caption" color="text.secondary" fontSize="0.55rem">
                  +{allDayBookings.length - 3} more
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      
      <Box sx={{ display: "flex" }}>
        <Box sx={{ width: 60, flexShrink: 0 }}>
          {HOURS.map(hour => (
            <Box key={hour} sx={{ height: 50, borderBottom: 1, borderRight: 1, borderColor: "divider", px: 0.5, pt: 0.25, display: "flex", alignItems: "flex-start" }}>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                {(hour % 12 || 12).toString().padStart(2, "0")} {hour >= 12 ? "PM" : "AM"}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {weekDates.map((date, idx) => {
          const dateStr = date.toISOString().split("T")[0];
          const dayBookings = bookingsByDate[dateStr] || [];
          const timedBookings = dayBookings.filter(b => b.startTime && b.startTime !== "00:00" && b.startTime !== "00:00:00");
          
          return (
            <Box key={idx} sx={{ flex: 1, borderRight: idx < 6 ? 1 : 0, borderColor: "divider", position: "relative" }}>
              {HOURS.map(hour => (
                <Box key={hour} sx={{ height: 50, borderBottom: 1, borderColor: "divider" }} />
              ))}
              
              {timedBookings.map(booking => {
                const [hours, minutes] = booking.startTime.split(":").map(Number);
                const startHour = hours + minutes / 60;
                const top = Math.max(0, (startHour - 7) * 50);
                
                let endHour = startHour + 1;
                if (booking.endTime) {
                  const [eh, em] = booking.endTime.split(":").map(Number);
                  endHour = eh + em / 60;
                }
                const height = Math.max(25, (endHour - startHour) * 50);
                
                const serviceInfo = booking.services?.map(s => s.service?.name || s.serviceName).filter(Boolean).join(", ") || booking.serviceVariation || "";
                
                return (
                  <Tooltip
                    key={booking.id}
                    title={`${formatShortName(booking)} - ${booking.address || booking.customer?.city || ""}`}
                  >
                    <Box
                      onClick={() => onBookingClick(booking)}
                      sx={{
                        position: "absolute",
                        top,
                        left: 2,
                        right: 2,
                        height: Math.min(height, HOURS.length * 50 - top),
                        bgcolor: getBookingColor(booking, crews),
                        color: "#fff",
                        borderRadius: 0.5,
                        p: 0.5,
                        fontSize: "0.65rem",
                        overflow: "hidden",
                        cursor: "pointer",
                        "&:hover": { opacity: 0.85, zIndex: 10 },
                      }}
                    >
                      <Typography variant="caption" fontSize="0.55rem" noWrap sx={{ opacity: 0.9 }}>
                        {formatTime(booking.startTime)}
                      </Typography>
                      <Typography variant="caption" display="block" fontWeight="bold" fontSize="0.65rem" noWrap>
                        {formatShortName(booking)}
                      </Typography>
                      {serviceInfo && height > 40 && (
                        <Typography variant="caption" fontSize="0.55rem" noWrap sx={{ opacity: 0.85 }}>
                          {serviceInfo}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function DayView({ currentDate, bookings, crews, onBookingClick }) {
  const dateStr = currentDate.toISOString().split("T")[0];
  const dayBookings = bookings.filter(b => b.scheduledDate === dateStr);
  
  const formattedDate = currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  
  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
        {formattedDate}
      </Typography>
      
      <Box sx={{ borderBottom: 2, borderColor: "divider", bgcolor: "grey.50", py: 1, px: 1.5, mb: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight="bold">All Day</Typography>
      </Box>
      
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        {dayBookings.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
            No appointments scheduled
          </Typography>
        ) : (
          dayBookings.map(booking => {
            const customerName = `${booking.customer?.firstName || ""} ${booking.customer?.lastName || ""}`.trim() || "Customer";
            const serviceInfo = booking.services?.map(s => s.service?.name || s.serviceName).filter(Boolean).join(", ") || booking.serviceVariation || "Service";
            let subtotal = parseFloat(booking.subtotal) || 0;
            if (subtotal === 0 && booking.services?.length > 0) {
              subtotal = booking.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
            }
            
            return (
              <Box
                key={booking.id}
                onClick={() => onBookingClick(booking)}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: { xs: 1, sm: 2 },
                  p: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Chip
                    label={customerName}
                    size="small"
                    sx={{
                      bgcolor: getBookingColor(booking, crews),
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      height: { xs: 26, sm: 28 },
                      maxWidth: { xs: "100%", sm: "auto" },
                      minWidth: { xs: "auto", sm: 150 },
                      borderRadius: 1,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                  {booking.startTime && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        display: { xs: "block", sm: "none" },
                        fontSize: "0.75rem",
                        ml: "auto",
                      }}
                    >
                      {formatTime(booking.startTime)}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ 
                  display: "flex", 
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: { xs: 0.5, sm: 2 },
                  flex: 1,
                  width: "100%",
                  pl: { xs: 0.5, sm: 0 },
                }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      flex: 1,
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    }}
                  >
                    {serviceInfo}
                  </Typography>
                  
                  {subtotal > 0 && (
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        color: "success.main",
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        whiteSpace: "nowrap",
                      }}
                    >
                      ${subtotal.toFixed(2)}
                    </Typography>
                  )}
                  
                  <Box sx={{ 
                    display: { xs: "none", sm: "flex" }, 
                    alignItems: "center", 
                    gap: 1,
                    flexShrink: 0,
                  }}>
                    {booking.startTime && (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatTime(booking.startTime)}
                        {booking.endTime && ` - ${formatTime(booking.endTime)}`}
                      </Typography>
                    )}
                    {booking.crew && (
                      <Chip
                        label={booking.crew.name}
                        size="small"
                        sx={{
                          bgcolor: booking.crew.color || "#6B7280",
                          color: "#fff",
                          fontSize: "0.7rem",
                          height: 22,
                        }}
                      />
                    )}
                  </Box>
                  
                  {booking.crew && (
                    <Chip
                      label={booking.crew.name}
                      size="small"
                      sx={{
                        display: { xs: "inline-flex", sm: "none" },
                        bgcolor: booking.crew.color || "#6B7280",
                        color: "#fff",
                        fontSize: "0.65rem",
                        height: 20,
                      }}
                    />
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch("/api/crews")
      .then(res => res.json())
      .then(data => setCrews(data))
      .catch(console.error);
  }, []);
  
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      
      let startDate, endDate;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      if (view === "month") {
        startDate = new Date(year, month, 1).toISOString().split("T")[0];
        endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
      } else if (view === "week") {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        startDate = weekStart.toISOString().split("T")[0];
        endDate = weekEnd.toISOString().split("T")[0];
      } else {
        startDate = currentDate.toISOString().split("T")[0];
        endDate = startDate;
      }
      
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          limit: "500",
        });
        if (selectedCrew) params.append("crewId", selectedCrew);
        
        const res = await fetch(`/api/bookings?${params}`);
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
      setLoading(false);
    };
    
    fetchBookings();
  }, [currentDate, view, selectedCrew]);
  
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };
  
  const goToToday = () => setCurrentDate(new Date());
  
  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    router.push(`/bookings/new?date=${dateStr}`);
  };

  const handleNewBookingClick = () => {
    router.push("/bookings/new");
  };
  
  const handleBookingClick = (booking) => {
    router.push(`/bookings/${booking.id}`);
  };
  
  const getDateRangeLabel = () => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (view === "week") {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
  };
  
  const totalProduction = useMemo(() => {
    return bookings.reduce((sum, b) => {
      let total = parseFloat(b.totalAmount) || parseFloat(b.subtotal) || 0;
      if (total === 0 && b.services?.length > 0) {
        total = b.services.reduce((s, svc) => s + (parseFloat(svc.price) || 0), 0);
      }
      return sum + total;
    }, 0);
  }, [bookings]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Content>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Schedule
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dashboard &gt; Schedule
          </Typography>
        </Box>
      </Box>
      
      <Card>
        <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ 
            display: "flex", 
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between", 
            alignItems: { xs: "stretch", md: "center" }, 
            gap: { xs: 1.5, md: 2 } 
          }}>
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" }, 
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}>
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: { xs: "space-between", sm: "flex-start" },
                gap: 0.5 
              }}>
                <IconButton size="small" onClick={() => navigateDate(-1)}>
                  <ChevronLeft fontSize="small" />
                </IconButton>
                <Typography 
                  variant="body2" 
                  fontWeight="medium" 
                  sx={{ 
                    minWidth: { xs: "auto", sm: 100 },
                    textAlign: "center",
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  }}
                >
                  {currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </Typography>
                <IconButton size="small" onClick={() => navigateDate(1)}>
                  <ChevronRight fontSize="small" />
                </IconButton>
              </Box>
              
              <Box sx={{ 
                display: "flex", 
                gap: 1, 
                flexWrap: "wrap",
                justifyContent: { xs: "space-between", sm: "flex-start" },
              }}>
                <FormControl size="small" sx={{ minWidth: { xs: "48%", sm: 90 }, flex: { xs: 1, sm: "none" } }}>
                  <InputLabel>Range</InputLabel>
                  <Select
                    value={view}
                    label="Range"
                    onChange={(e) => setView(e.target.value)}
                  >
                    <MenuItem value="month">Month</MenuItem>
                    <MenuItem value="week">Week</MenuItem>
                    <MenuItem value="day">Day</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: { xs: "48%", sm: 100 }, flex: { xs: 1, sm: "none" } }}>
                  <InputLabel>Crew</InputLabel>
                  <Select
                    value={selectedCrew}
                    label="Crew"
                    onChange={(e) => setSelectedCrew(e.target.value)}
                  >
                    <MenuItem value="">All Crews</MenuItem>
                    {crews.map((crew) => (
                      <MenuItem key={crew.id} value={crew.id.toString()}>
                        {crew.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  color: "text.primary",
                  display: { xs: "none", sm: "block" },
                }}
              >
                Total: ${totalProduction.toFixed(2)}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: { xs: "space-between", md: "flex-end" },
              gap: 1 
            }}>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  color: "text.primary",
                  display: { xs: "block", sm: "none" },
                  fontSize: "0.8rem",
                }}
              >
                ${totalProduction.toFixed(2)}
              </Typography>
              
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={handlePrint}
                  sx={{ 
                    display: { xs: "flex", sm: "none" },
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Print fontSize="small" />
                </IconButton>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Print />}
                  onClick={handlePrint}
                  sx={{ 
                    borderColor: "divider", 
                    color: "text.secondary",
                    display: { xs: "none", sm: "flex" },
                  }}
                >
                  Print
                </Button>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={handleNewBookingClick}
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1.5, sm: 2 },
                    whiteSpace: "nowrap",
                  }}
                >
                  Book
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
        
        <Box sx={{ borderTop: 1, borderColor: "divider", minHeight: 500 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
              <BrandLoader />
            </Box>
          ) : view === "month" ? (
            <MonthView
              currentDate={currentDate}
              bookings={bookings}
              crews={crews}
              onDateClick={handleDateClick}
              onBookingClick={handleBookingClick}
            />
          ) : view === "week" ? (
            <WeekView
              currentDate={currentDate}
              bookings={bookings}
              crews={crews}
              onBookingClick={handleBookingClick}
            />
          ) : (
            <DayView
              currentDate={currentDate}
              bookings={bookings}
              crews={crews}
              onBookingClick={handleBookingClick}
            />
          )}
        </Box>
      </Card>

    </Content>
  );
}
