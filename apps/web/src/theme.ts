import { createTheme, alpha } from "@mui/material/styles";

const ocean = {
  50: "#e3f5f9",
  100: "#b8e5ef",
  200: "#89d4e5",
  300: "#55c3da",
  400: "#2bb5d2",
  500: "#00a7ca",
  600: "#0097b8",
  700: "#0082a1",
  800: "#006e8b",
  900: "#004d65",
};

const coral = {
  50: "#fff3ed",
  100: "#ffe0d2",
  200: "#ffcbb4",
  300: "#ffb496",
  400: "#ffa07b",
  500: "#ff8c61",
  600: "#f07a52",
  700: "#dc6440",
  800: "#c44f30",
  900: "#a03a20",
};

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ocean[400], light: ocean[200], dark: ocean[700] },
    secondary: { main: coral[400], light: coral[200], dark: coral[700] },
    background: {
      default: "#0a1929",
      paper: "#0f2744",
    },
    success: { main: "#4caf50" },
    warning: { main: "#ff9800" },
    error: { main: "#f44336" },
    info: { main: ocean[300] },
    text: {
      primary: "#e3e8ef",
      secondary: "#94a3b8",
    },
    divider: alpha("#94a3b8", 0.12),
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h1: { fontWeight: 700, fontSize: "2.5rem", letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.01em" },
    h3: { fontWeight: 600, fontSize: "1.5rem" },
    h4: { fontWeight: 600, fontSize: "1.25rem" },
    h5: { fontWeight: 600, fontSize: "1.1rem" },
    h6: { fontWeight: 600, fontSize: "1rem" },
    subtitle1: { fontWeight: 500, color: "#94a3b8" },
    subtitle2: { fontWeight: 500, fontSize: "0.875rem", color: "#94a3b8" },
    body2: { color: "#94a3b8" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: "#1e3a5f #0a1929",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "#0a1929" },
          "&::-webkit-scrollbar-thumb": {
            background: "#1e3a5f",
            borderRadius: 3,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "8px 20px",
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ocean[400]}, ${ocean[600]})`,
          "&:hover": {
            background: `linear-gradient(135deg, ${ocean[300]}, ${ocean[500]})`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#94a3b8", 0.08)}`,
          backdropFilter: "blur(20px)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 8px 32px ${alpha(ocean[700], 0.25)}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0b1e36",
          borderRight: `1px solid ${alpha("#94a3b8", 0.08)}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#0a1929", 0.8),
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha("#94a3b8", 0.08)}`,
          boxShadow: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: "2px 8px",
          "&.Mui-selected": {
            backgroundColor: alpha(ocean[500], 0.15),
            "&:hover": { backgroundColor: alpha(ocean[500], 0.2) },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 8 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${alpha("#94a3b8", 0.08)}` },
        head: {
          fontWeight: 600,
          color: "#94a3b8",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
  },
});
