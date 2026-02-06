"use client";

import { useState, useEffect } from "react";
import Content from "@/components/common/Content";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
} from "@mui/material";
import BrandLoader from "@/components/BrandLoader";
import {
  EmojiEvents as TrophyIcon,
  WorkspacePremium as MedalIcon,
} from "@mui/icons-material";

function getLevelFromXP(xp) {
  return Math.floor(xp / 1000) + 1;
}

function getXPProgress(xp) {
  return (xp % 1000) / 10;
}

function getRankColor(rank) {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "#9ca3af";
}

export default function LeaderboardPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setStaff(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching staff:", err);
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

  const topThree = staff.slice(0, 3);
  const others = staff.slice(3);

  return (
    <Content>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Top performers based on XP earned
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {topThree.map((member, index) => {
          const rank = index + 1;
          const level = getLevelFromXP(member.xp || 0);
          return (
            <Grid item xs={12} md={4} key={member.id}>
              <Card
                sx={{
                  background: rank === 1
                    ? "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)"
                    : rank === 2
                    ? "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)"
                    : "linear-gradient(135deg, #fed7aa 0%, #fb923c 100%)",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Box sx={{ position: "relative" }}>
                      <Avatar
                        src={member.avatarUrl}
                        sx={{ width: 64, height: 64, border: `3px solid ${getRankColor(rank)}` }}
                      >
                        {member.firstName?.charAt(0) || "?"}
                      </Avatar>
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          bgcolor: getRankColor(rank),
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {rank === 1 ? (
                          <TrophyIcon sx={{ fontSize: 14, color: "#fff" }} />
                        ) : (
                          <Typography variant="caption" fontWeight="bold" color="#fff">
                            {rank}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {member.firstName} {member.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Level {level}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {(member.xp || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "flex-end" }}>
                      XP
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Jobs</Typography>
                      <Typography fontWeight="bold">{member.stats?.totalJobsCompleted || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Earnings</Typography>
                      <Typography fontWeight="bold">${parseFloat(member.stats?.totalEarnings || 0).toFixed(0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Rating</Typography>
                      <Typography fontWeight="bold">{member.stats?.averageRating?.toFixed(1) || "N/A"}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {others.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Other Team Members
            </Typography>
            {others.map((member, index) => {
              const rank = index + 4;
              const level = getLevelFromXP(member.xp || 0);
              const progress = getXPProgress(member.xp || 0);
              return (
                <Box
                  key={member.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    py: 2,
                    borderBottom: index < others.length - 1 ? "1px solid #eee" : "none",
                  }}
                >
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    sx={{ width: 32, textAlign: "center", color: "text.secondary" }}
                  >
                    #{rank}
                  </Typography>
                  <Avatar src={member.avatarUrl} sx={{ bgcolor: "#3b82f6" }}>
                    {member.firstName?.charAt(0) || "?"}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="medium">
                      {member.firstName} {member.lastName}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Level {level}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ width: 60, height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography fontWeight="bold">{(member.xp || 0).toLocaleString()} XP</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.stats?.totalJobsCompleted || 0} jobs
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}
    </Content>
  );
}
