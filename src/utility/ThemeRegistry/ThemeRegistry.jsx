"use client";
import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import NextAppDirEmotionCacheProvider from "./EmotionCache";
import { ThemeModeProvider, useThemeMode } from "./ThemeContext";
import { SessionProvider } from "next-auth/react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { ToastContainer } from "react-toastify";
import SimpleBackdrop from "@/components/common/SimpleBackdrop";

function ThemeWrapper({ children }) {
  const { theme } = useThemeMode();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function ThemeRegistry({ children }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: "mui" }}>
      <ThemeModeProvider>
        <ThemeWrapper>
          <SessionProvider>
            <main>
              <ProgressBar
                height="2px"
                color="#1976d2"
                options={{
                  showSpinner: true,
                  easing: "ease",
                  speed: 500,
                }}
                shallowRouting
              />
              <SimpleBackdrop />
              <ToastContainer autoClose={1500} draggable={false} />
              {children}
            </main>
          </SessionProvider>
        </ThemeWrapper>
      </ThemeModeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}
