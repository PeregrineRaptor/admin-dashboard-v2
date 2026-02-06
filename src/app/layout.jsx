import "@/styles/globals.scss";
import "react-toastify/dist/ReactToastify.css";
import Favicon from "@/components/common/Head/Favicon";
import { Poppins, Roboto } from "next/font/google";
import ThemeRegistry from "@/utility/ThemeRegistry/ThemeRegistry";
import RtkProvider from "@/lib/rtk/RtkProvider";

export const dynamic = 'force-dynamic';

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

export const metadata = {
  title: {
    template: "%s | Walton",
    default: "One Stop Solution (OSS)",
  },
  description: "One app for all your communication services!",
};

export default function RootLayout({ children }) {
  return (
    <RtkProvider>
      <html lang="en" className={`${roboto.variable} ${poppins.variable}`}>
        <head>
          <Favicon />
        </head>
        <body id="root">
          <ThemeRegistry>{children}</ThemeRegistry>
        </body>
      </html>
    </RtkProvider>
  );
}
