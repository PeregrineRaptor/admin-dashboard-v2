"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  IconButton,
  Slider,
  Skeleton,
} from "@mui/material";
import {
  ArrowBack,
  Phone,
  PhoneCallback,
  PhoneMissed,
  PlayArrow,
  Pause,
  Voicemail,
  Person,
  Business,
  AccessTime,
  VolumeUp,
  AutoAwesome,
  Refresh,
  OpenInNew,
} from "@mui/icons-material";
import Content from "@/components/common/Content";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

function AISummaryCard({ callId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aircall/${callId}/summary?type=detailed`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate summary");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (callId) {
      fetchSummary();
    }
  }, [callId]);

  return (
    <Card sx={{ mb: 3, border: "1px solid", borderColor: "primary.main" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AutoAwesome color="primary" />
            <Typography variant="subtitle1" fontWeight="bold">
              AI Summary
            </Typography>
          </Box>
          <IconButton size="small" onClick={fetchSummary} disabled={loading}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box>
            <Skeleton variant="text" width="100%" height={24} />
            <Skeleton variant="text" width="90%" height={24} />
            <Skeleton variant="text" width="95%" height={24} />
            <Skeleton variant="text" width="80%" height={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 0 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ 
            "& h1, & h2, & h3, & h4": { fontSize: "1rem", fontWeight: "bold", mt: 2, mb: 1 },
            "& p": { mb: 1.5 },
            "& ul, & ol": { pl: 2, mb: 1.5 },
            "& li": { mb: 0.5 },
            "& strong": { color: "primary.main" },
          }}>
            <ReactMarkdown>{summary}</ReactMarkdown>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AircallDetailPage() {
  const router = useRouter();
  const params = useParams();
  const callId = params.id;

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (callId) {
      fetchCallDetails();
    }
  }, [callId]);

  const fetchCallDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aircall/${callId}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setCall(data.call);
    } catch (err) {
      console.error("Error fetching call:", err);
      setError(err.message || "Failed to fetch call details");
    }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCallIcon = () => {
    if (!call) return null;
    if (call.status === "done" && call.direction === "inbound") {
      return <PhoneCallback sx={{ fontSize: 40 }} color="success" />;
    }
    if (call.status === "done" && call.direction === "outbound") {
      return <Phone sx={{ fontSize: 40 }} color="primary" />;
    }
    if (call.voicemail) {
      return <Voicemail sx={{ fontSize: 40 }} color="warning" />;
    }
    return <PhoneMissed sx={{ fontSize: 40 }} color="error" />;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (_, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  if (loading) {
    return (
      <Content>
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Content>
    );
  }

  if (error) {
    return (
      <Content>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/aircall")} sx={{ mb: 2 }}>
          Back to Calls
        </Button>
        <Alert severity="error">{error}</Alert>
      </Content>
    );
  }

  if (!call) {
    return (
      <Content>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/aircall")} sx={{ mb: 2 }}>
          Back to Calls
        </Button>
        <Alert severity="warning">Call not found</Alert>
      </Content>
    );
  }

  const callerName = call.crmCustomer
    ? [call.crmCustomer.firstName, call.crmCustomer.lastName].filter(Boolean).join(" ") || "CRM Customer"
    : call.contact
      ? [call.contact.firstName, call.contact.lastName].filter(Boolean).join(" ") || call.rawDigits
      : call.rawDigits || "Unknown";

  return (
    <Content>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/aircall")} color="inherit">
          Back
        </Button>
        <Typography variant="h5" fontWeight="bold">
          Call Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                {getCallIcon()}
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {callerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {call.rawDigits}
                  </Typography>
                </Box>
                <Box sx={{ ml: "auto" }}>
                  <Chip
                    label={call.direction === "inbound" ? "Inbound" : "Outbound"}
                    color={call.direction === "inbound" ? "info" : "default"}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={call.status === "done" ? "Completed" : call.missedCallReason?.replace(/_/g, " ") || call.status}
                    color={call.status === "done" ? "success" : "error"}
                    size="small"
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    <AccessTime fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                    {formatDuration(call.duration)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(call.startedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Line
                  </Typography>
                  <Typography variant="body2">
                    {call.number?.name || call.number?.digits || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Agent
                  </Typography>
                  <Typography variant="body2">
                    <Person fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                    {call.user?.name || "-"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <AISummaryCard callId={callId} />

          {(call.recording || call.voicemail) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  <VolumeUp sx={{ verticalAlign: "middle", mr: 1 }} />
                  {call.voicemail ? "Voicemail" : "Recording"}
                </Typography>

                <audio
                  ref={audioRef}
                  src={call.voicemail || call.recording}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                />

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <IconButton onClick={handlePlayPause} color="primary" size="large">
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 45 }}>
                    {formatDuration(currentTime)}
                  </Typography>
                  <Slider
                    value={currentTime}
                    max={duration || 100}
                    onChange={handleSliderChange}
                    sx={{ flex: 1 }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 45 }}>
                    {formatDuration(duration)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {call.transcript && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Transcript
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: "auto", bgcolor: "background.default" }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {call.transcript}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          )}

          {call.comments && call.comments.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Notes & Comments
                </Typography>
                {call.comments.map((comment, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <Typography variant="body2">{comment.content}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {comment.posted_by?.name} - {new Date(comment.posted_at * 1000).toLocaleString()}
                    </Typography>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {call.crmCustomer && (
            <Card sx={{ mb: 3, border: "2px solid", borderColor: "primary.main" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                  <Person sx={{ mr: 1 }} color="primary" />
                  CRM Customer
                </Typography>
                <Link href={`/customers/${call.crmCustomer.id}`} style={{ textDecoration: "none" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      {[call.crmCustomer.firstName, call.crmCustomer.lastName].filter(Boolean).join(" ")}
                    </Typography>
                    <OpenInNew fontSize="small" color="primary" />
                  </Box>
                </Link>
                {call.crmCustomer.companyName && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Business fontSize="small" /> {call.crmCustomer.companyName}
                  </Typography>
                )}
                {call.crmCustomer.email && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {call.crmCustomer.email}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {call.rawDigits}
                </Typography>
                <Button
                  component={Link}
                  href={`/customers/${call.crmCustomer.id}`}
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  View Customer Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {call.contact && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  <Person sx={{ verticalAlign: "middle", mr: 1 }} />
                  Aircall Contact
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {[call.contact.firstName, call.contact.lastName].filter(Boolean).join(" ")}
                </Typography>
                {call.contact.company && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Business fontSize="small" /> {call.contact.company}
                  </Typography>
                )}
                {call.contact.phoneNumbers?.map((phone, idx) => (
                  <Typography key={idx} variant="body2" sx={{ mt: 1 }}>
                    {phone.label}: {phone.value}
                  </Typography>
                ))}
                {call.contact.emails?.map((email, idx) => (
                  <Typography key={idx} variant="body2">
                    {email.label}: {email.value}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          )}

          {call.tags && call.tags.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Tags
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {call.tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      sx={{ bgcolor: tag.color || "primary.main", color: "white" }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Content>
  );
}
