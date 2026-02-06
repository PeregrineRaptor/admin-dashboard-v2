import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { useSelector } from "react-redux";

export default function SimpleBackdrop() {
  const { backDrop } = useSelector((state) => state.dashboard);
  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={backDrop}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
