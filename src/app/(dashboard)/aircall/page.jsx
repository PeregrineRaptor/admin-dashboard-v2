"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Tooltip,
  Skeleton,
  Button,
} from "@mui/material";
import {
  Phone,
  PhoneCallback,
  PhoneMissed,
  PlayArrow,
  Voicemail,
  Refresh,
  AutoAwesome,
  OpenInNew,
} from "@mui/icons-material";
import Content from "@/components/common/Content";
import Link from "next/link";

function CallSummary({ callId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [requested, setRequested] = useState(false);

  const fetchSummary = async (e) => {
    e.stopPropagation();
    setRequested(true);
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/aircall/${callId}/summary?type=short`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  if (!requested) {
    return (
      <Button 
        size="small" 
        variant="text" 
        onClick={fetchSummary}
        startIcon={<AutoAwesome fontSize="small" />}
        sx={{ textTransform: "none", fontSize: "0.75rem" }}
      >
        Get AI Summary
      </Button>
    );
  }

  if (loading) {
    return <Skeleton variant="text" width="100%" height={20} />;
  }

  if (error || !summary) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Summary unavailable
      </Typography>
    );
  }

  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 250 }}>
      {summary}
    </Typography>
  );
}

export default function AircallPage() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, perPage: 25 });

  useEffect(() => {
    fetchCalls();
  }, [page]);

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aircall?page=${page}&per_page=25&order=desc`);
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setCalls(data.calls || []);
      setMeta(data.meta || { total: 0, perPage: 25 });
    } catch (err) {
      console.error("Error fetching calls:", err);
      setError(err.message || "Failed to fetch calls");
    }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCallIcon = (call) => {
    if (call.status === "done" && call.direction === "inbound") {
      return <PhoneCallback color="success" />;
    }
    if (call.status === "done" && call.direction === "outbound") {
      return <Phone color="primary" />;
    }
    if (call.voicemail) {
      return <Voicemail color="warning" />;
    }
    return <PhoneMissed color="error" />;
  };

  const getStatusChip = (call) => {
    if (call.status === "done") {
      return <Chip label="Completed" color="success" size="small" />;
    }
    if (call.missedCallReason) {
      return <Chip label={call.missedCallReason.replace(/_/g, " ")} color="error" size="small" />;
    }
    return <Chip label={call.status} size="small" />;
  };

  const getCallerInfo = (call) => {
    if (call.crmCustomer) {
      const name = [call.crmCustomer.firstName, call.crmCustomer.lastName].filter(Boolean).join(" ");
      return { name: name || "CRM Customer", isCrm: true, customerId: call.crmCustomer.id };
    }
    if (call.contact) {
      const name = [call.contact.firstName, call.contact.lastName].filter(Boolean).join(" ");
      return { name: name || call.rawDigits || "Unknown", isCrm: false };
    }
    return { name: call.rawDigits || "Unknown", isCrm: false };
  };

  const handleRowClick = (callId) => {
    router.push(`/aircall/${callId}`);
  };

  const totalPages = Math.ceil(meta.total / meta.perPage);

  return (
    <Content>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            Aircall - Call History
          </Typography>
          <Tooltip title="AI-powered summaries">
            <AutoAwesome color="primary" fontSize="small" />
          </Tooltip>
        </Box>
        <IconButton onClick={fetchCalls} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : calls.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No calls found</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width={50}></TableCell>
                      <TableCell>Caller / Contact</TableCell>
                      <TableCell>AI Summary</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell width={60}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calls.map((call) => (
                      <TableRow
                        key={call.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleRowClick(call.id)}
                      >
                        <TableCell>
                          <Tooltip title={`${call.direction} call`}>
                            {getCallIcon(call)}
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const caller = getCallerInfo(call);
                            return (
                              <>
                                {caller.isCrm ? (
                                  <Link 
                                    href={`/customers/${caller.customerId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ textDecoration: "none" }}
                                  >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                      <Typography variant="body2" fontWeight="medium" color="primary">
                                        {caller.name}
                                      </Typography>
                                      <OpenInNew sx={{ fontSize: 14 }} color="primary" />
                                    </Box>
                                  </Link>
                                ) : (
                                  <Typography variant="body2" fontWeight="medium">
                                    {caller.name}
                                  </Typography>
                                )}
                                {call.crmCustomer?.companyName && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {call.crmCustomer.companyName}
                                  </Typography>
                                )}
                                {!call.crmCustomer && call.contact?.company && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {call.contact.company}
                                  </Typography>
                                )}
                                {call.rawDigits && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {call.rawDigits}
                                  </Typography>
                                )}
                              </>
                            );
                          })()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <CallSummary callId={call.id} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {call.user?.name || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(call)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDuration(call.duration)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(call.startedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {call.recording && (
                            <Tooltip title="Has recording">
                              <PlayArrow color="primary" fontSize="small" />
                            </Tooltip>
                          )}
                          {call.voicemail && (
                            <Tooltip title="Has voicemail">
                              <Voicemail color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
        Showing {calls.length} of {meta.total} calls. Click a call to view details, transcript, and full AI summary.
      </Typography>
    </Content>
  );
}
