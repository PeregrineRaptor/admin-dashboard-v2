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

let theme = createTheme({
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
      light: "#0cb6d8",
      main: "#0aa2c0",
      dark: "#098da8",
      contrastText: "#fff",
    },
    success: {
      light: "#24963e",
      main: "#208637",
      dark: "#1c7530",
      contrastText: "#fff",
    },
    border: {
      light: "#009900",
      main: "#e0e0e0",
      dark: "#006600",
      contrastText: "#fff",
    },
    extend: {
      white: "#ffffff",
    },
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          paddingLeft: "12px",
          paddingRight: "12px",
        },
      },
    },
  },
});
theme = responsiveFontSizes(theme);

export default theme;
