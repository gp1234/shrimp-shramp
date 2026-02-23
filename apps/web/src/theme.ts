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

/* ── Sidebar colours (always dark / navy) ── */
const sidebarBg = "#0b1e36";
const sidebarBorder = alpha("#94a3b8", 0.08);

export function buildTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: ocean[400], light: ocean[200], dark: ocean[700] },
      secondary: { main: coral[400], light: coral[200], dark: coral[700] },
      background: {
        default: isDark ? "#0a1929" : "#f4f6f8",
        paper: isDark ? "#0f2744" : "#ffffff",
      },
      success: { main: "#4caf50" },
      warning: { main: "#ff9800" },
      error: { main: "#f44336" },
      info: { main: ocean[300] },
      text: {
        primary: isDark ? "#e3e8ef" : "#1a2027",
        secondary: isDark ? "#94a3b8" : "#637381",
      },
      divider: isDark ? alpha("#94a3b8", 0.12) : alpha("#919eab", 0.2),
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      h1: { fontWeight: 700, fontSize: "2.5rem", letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.01em" },
      h3: { fontWeight: 600, fontSize: "1.5rem" },
      h4: { fontWeight: 600, fontSize: "1.25rem" },
      h5: { fontWeight: 600, fontSize: "1.1rem" },
      h6: { fontWeight: 600, fontSize: "1rem" },
      subtitle1: {
        fontWeight: 500,
        color: isDark ? "#94a3b8" : "#637381",
      },
      subtitle2: {
        fontWeight: 500,
        fontSize: "0.875rem",
        color: isDark ? "#94a3b8" : "#637381",
      },
      body2: { color: isDark ? "#94a3b8" : "#637381" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "thin",
            scrollbarColor: isDark
              ? "#1e3a5f #0a1929"
              : `${alpha("#919eab", 0.3)} transparent`,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": {
              background: isDark ? "#0a1929" : "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "#1e3a5f" : alpha("#919eab", 0.4),
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
            background: ocean[500],
            "&:hover": {
              background: ocean[600],
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${isDark ? alpha("#94a3b8", 0.08) : alpha("#919eab", 0.16)}`,
            backdropFilter: isDark ? "blur(20px)" : "none",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: isDark
                ? `0 8px 32px ${alpha(ocean[700], 0.25)}`
                : `0 8px 24px ${alpha("#919eab", 0.16)}`,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      /* ── Sidebar always stays dark / navy ── */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: sidebarBg,
            borderRight: `1px solid ${sidebarBorder}`,
            color: "#e3e8ef",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? alpha("#0a1929", 0.8)
              : alpha("#ffffff", 0.8),
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${isDark ? alpha("#94a3b8", 0.08) : alpha("#919eab", 0.24)}`,
            boxShadow: "none",
            color: isDark ? "#e3e8ef" : "#1a2027",
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
          root: {
            borderBottom: `1px solid ${isDark ? alpha("#94a3b8", 0.08) : alpha("#919eab", 0.16)}`,
          },
          head: {
            fontWeight: 600,
            color: isDark ? "#94a3b8" : "#637381",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
        },
      },
    },
  });
}

// Keep a default export for backwards compat
export const theme = buildTheme("light");
