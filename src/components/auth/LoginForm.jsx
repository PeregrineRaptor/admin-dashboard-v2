"use client";
import { hdlBackDrop } from "@/lib/rtk/features/common/dashboardSlice";
import theme from "@/utility/ThemeRegistry/theme";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { signIn } from "next-auth/react";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MdOutlineLogin, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { toast } from "react-toastify";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
const schema = yup.object({
  email: yup.string().email().required().label("Email"),
  password: yup
    .string()
    .required()
    .min(6, "Password min 6 characters")
    .label("Password"),
});

const defaultValues = {
  email: "",
  password: "",
};

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const router = useRouter();
  const onSubmit = async (data) => {
    dispatch(hdlBackDrop(true));
    const result = await signIn("credentials", {
      ...data,
      redirect: false,
      callbackUrl: "/",
    });
    if (result.status == 200 && result?.ok) {
      toast.success("Welcome! Your login was successful.");
      dispatch(hdlBackDrop(false));
      if (callbackUrl !== null && callbackUrl !== "/") {
        router.push(callbackUrl);
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      dispatch(hdlBackDrop(false));
      toast.error(result.error);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: yupResolver(schema),
  });

  return (
    <Box sx={{ position: "relative", img: {} }}>
      <Box
        component="figure"
        // style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 10,
          backgroundColor: alpha("#ffffff", 0.9),
        }}
      ></Box>
      <NextImage
        src="/images/login/login-bg.jpg"
        fill
        alt="login-bg"
        className="object-cover object-center"
      />
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 20,
        }}
      >
        <Box
          sx={{
            maxWidth: "470px",
            position: "relative",
            "&:before": {
              content: "''",
              top: "-79px",
              left: "-46px",
              width: "238px",
              height: "234px",
              position: "absolute",
              zIndex: -1,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='239' height='234' viewBox='0 0 239 234' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='88.5605' y='0.700195' width='149' height='149' rx='19.5' stroke='%23${theme.palette.primary.main.slice(
                1
              )}' stroke-opacity='0.16'/%3E%3Crect x='0.621094' y='33.761' width='200' height='200' rx='10' fill='%23${theme.palette.primary.main.slice(
                1
              )}' fill-opacity='0.08'/%3E%3C/svg%3E")`,
            },

            "&:after": {
              content: "''",
              bottom: "-54px",
              right: "-57px",
              width: "180px",
              height: "180px",
              position: "absolute",
              zIndex: -1,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='181' height='181' viewBox='0 0 181 181' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1.30469' y='1.44312' width='178' height='178' rx='19' stroke='%23${theme.palette.primary.main.slice(
                1
              )}' stroke-opacity='0.16' stroke-width='2' stroke-dasharray='8 8'/%3E%3Crect x='22.8047' y='22.9431' width='135' height='135' rx='10' fill='%23${theme.palette.primary.main.slice(
                1
              )}' fill-opacity='0.08'/%3E%3C/svg%3E")`,
            },
          }}
        >
          <Card variant="outlined" sx={{ pt: "16px", pb: "16px" }}>
            <Box
              component="figure"
              sx={{ textAlign: "center", img: { m: "auto" } }}
            >
              <NextImage
                src="/images/logo/walton-logo.png"
                width="100"
                height="100"
                alt="logo"
              />
            </Box>
            <CardContent>
              <Typography sx={{ fontWeight: 600, color: "error.main" }}>
                Welcome to{" "}
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: "600", color: "primary.main" }}
              >
                One Stop Solution (OSS)
              </Typography>
              <Typography>
                Please sign-in to your account and start the adventure 👋🏻
              </Typography>
              <Box
                component="form"
                noValidate
                autoComplete="off"
                sx={{ mt: "32px" }}
                onSubmit={handleSubmit(onSubmit)}
              >
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      label="Email"
                      margin="dense"
                      error={!!errors.email?.message}
                      helperText={errors.email?.message}
                    />
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => {
                    return (
                      <TextField
                        {...field}
                        label="Password"
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                        type={showPassword ? "text" : "password"}
                        fullWidth
                        size="small"
                        margin="dense"
                        error={!!errors.password?.message}
                        helperText={errors.password?.message}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                edge="end"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <MdVisibilityOff />
                                ) : (
                                  <MdVisibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    );
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<MdOutlineLogin />}
                  fullWidth
                  size="small"
                  type="submit"
                  sx={{ mt: "16px" }}
                >
                  Login
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
