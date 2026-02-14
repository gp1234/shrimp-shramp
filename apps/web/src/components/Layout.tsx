import { useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useFarm } from "../contexts/FarmContext";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  alpha,
  useTheme,
  Tooltip,
  Menu,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  FormControl,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Pool as PondIcon,
  Loop as CycleIcon,
  Restaurant as FeedIcon,
  Water as WaterIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  AttachMoney as FinancialIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Business as FarmIcon,
} from "@mui/icons-material";

const DRAWER_WIDTH = 260;

const navItems = [
  { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: "/" },
  { labelKey: "nav.ponds", icon: <PondIcon />, path: "/ponds" },
  { labelKey: "nav.cycles", icon: <CycleIcon />, path: "/cycles" },
  { labelKey: "nav.feeding", icon: <FeedIcon />, path: "/feeding" },
  { labelKey: "nav.waterQuality", icon: <WaterIcon />, path: "/water-quality" },
  { labelKey: "nav.inventory", icon: <InventoryIcon />, path: "/inventory" },
  { labelKey: "nav.personnel", icon: <PeopleIcon />, path: "/personnel" },
  { labelKey: "nav.financial", icon: <FinancialIcon />, path: "/financial" },
];

export function Layout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentFarm, availableFarms, setCurrentFarm } = useFarm();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLanguageChange = (_: any, newLang: string | null) => {
    if (newLang) i18n.changeLanguage(newLang);
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            fontSize: "1.4rem",
          }}
        >
          🦐
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}
          >
            {t("app.name")}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {t("app.subtitle")}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.06 }} />

      {/* Nav items */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={isActive}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                mb: 0.5,
                "& .MuiListItemIcon-root": {
                  color: isActive ? "primary.main" : "text.secondary",
                  minWidth: 40,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "text.primary" : "text.secondary",
                }}
              />
              {isActive && (
                <Box
                  sx={{
                    width: 4,
                    height: 24,
                    borderRadius: 2,
                    background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ opacity: 0.06 }} />

      {/* Language toggle */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "center" }}>
        <ToggleButtonGroup
          value={i18n.language}
          exclusive
          onChange={handleLanguageChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              px: 2,
              py: 0.3,
              fontSize: "0.7rem",
              fontWeight: 600,
              border: `1px solid ${alpha("#94a3b8", 0.15)}`,
              color: "text.secondary",
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: "primary.main",
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
            },
          }}
        >
          <ToggleButton value="es">ES</ToggleButton>
          <ToggleButton value="en">EN</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ opacity: 0.06 }} />

      {/* User */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {user?.name?.charAt(0) || "U"}
        </Avatar>
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.8rem" }}
            noWrap
          >
            {user?.name || "User"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.65rem" }}
            noWrap
          >
            {user?.roles?.join(", ") || "Viewer"}
          </Typography>
        </Box>
        <Tooltip title={t("nav.settings")}>
          <IconButton
            size="small"
            sx={{ color: "text.secondary" }}
            onClick={() => {
              navigate("/settings");
              setMobileOpen(false);
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        {/* Top bar */}
        <AppBar
          position="sticky"
          sx={{
            ml: { md: `${DRAWER_WIDTH}px` },
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: "none" }, color: "text.secondary" }}
            >
              <MenuIcon />
            </IconButton>

            {/* Farm Selector */}
            {currentFarm && availableFarms.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={currentFarm.id}
                  onChange={(e) => {
                    const farm = availableFarms.find(
                      (f) => f.id === e.target.value,
                    );
                    if (farm) setCurrentFarm(farm);
                  }}
                  startAdornment={
                    <FarmIcon
                      sx={{ mr: 1, fontSize: "1.1rem", color: "primary.main" }}
                    />
                  }
                  sx={{
                    "& .MuiSelect-select": {
                      py: 0.75,
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                >
                  {availableFarms.map((farm) => (
                    <MenuItem key={farm.id} value={farm.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {farm.name}
                        </Typography>
                        {farm.location && (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {farm.location}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ flex: 1 }} />
            <Tooltip title={t("auth.account")}>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    fontSize: "0.8rem",
                  }}
                >
                  {user?.name?.charAt(0) || "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  logout();
                  navigate("/login");
                }}
              >
                <LogoutIcon sx={{ mr: 1, fontSize: "1.1rem" }} />{" "}
                {t("auth.logout")}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            background: `radial-gradient(ellipse at top left, ${alpha(theme.palette.primary.dark, 0.08)}, transparent 60%)`,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
