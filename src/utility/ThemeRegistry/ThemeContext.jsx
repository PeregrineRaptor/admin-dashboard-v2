"use client";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { Roboto, Poppins } from "next/font/google";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const ThemeContext = createContext({
  mode: "light",
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const savedMode = localStorage.getItem("themeMode");
    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-bg",
      mode === "dark" ? "#1e1e1e" : "#3753a4"
    );
  }, [mode]);

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem("themeMode", newMode);
  };

  const theme = useMemo(() => {
    let t = createTheme({
      typography: {
        fontFamily: [roboto.style.fontFamily, poppins.style.fontFamily].join(","),
        h1: { fontFamily: poppins.style.fontFamily },
        h2: { fontFamily: poppins.style.fontFamily },
        h3: { fontFamily: poppins.style.fontFamily },
        h4: { fontFamily: poppins.style.fontFamily },
        h5: { fontFamily: poppins.style.fontFamily },
        h6: { fontFamily: poppins.style.fontFamily },
      },
      palette: {
        mode,
        primary: {
          light: "#3753a4",
          main: "#21409a",
          dark: "#1e3a8b",
          contrastText: "#fff",
        },
        secondary: {
          light: "#ba68c8",
          main: "#9c27b0",
          dark: "#7b1fa2",
          contrastText: "#fff",
        },
        error: {
          light: "#ef333a",
          main: "#ed1c24",
          dark: "#d51920",
          contrastText: "#fff",
        },
        warning: {
          light: "#fcaa45",
          main: "#fca130",
          dark: "#e3912b",
          contrastText: "#fff",
        },
        info: {
          light: "#379dfe",
          main: "#138ffe",
          dark: "#1180e5",
          contrastText: "#fff",
        },
        success: {
          light: "#56ae5b",
          main: "#34a53a",
          dark: "#2f9534",
          contrastText: "#fff",
        },
        ...(mode === "dark" ? {
          background: {
            default: "#121212",
            paper: "#1e1e1e",
          },
          text: {
            primary: "#ffffff",
            secondary: "#b0b0b0",
          },
        } : {}),
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: mode === "dark" ? "#1e1e1e" : "#ffffff",
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: mode === "dark" ? "#1e1e1e" : "#ffffff",
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: mode === "dark" ? "#121212" : "#f5f5f5",
            },
          },
        },
      },
    });
    return responsiveFontSizes(t);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}
