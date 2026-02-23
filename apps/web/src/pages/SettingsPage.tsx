import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  alpha,
  useTheme,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Language,
  Person,
  Security,
  LightMode,
  DarkMode,
  Palette,
} from "@mui/icons-material";

export function SettingsPage() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();

  const handleLanguageChange = (_: any, newLang: string | null) => {
    if (newLang) i18n.changeLanguage(newLang);
  };

  const handleThemeChange = (_: any, newMode: string | null) => {
    if (newMode && newMode !== mode) toggleTheme();
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("settings.title")}
        </Typography>
        <Typography variant="body2">{t("settings.subtitle")}</Typography>
      </Box>

      {/* Profile */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Person sx={{ color: "primary.main" }} />
            <Typography variant="h5">{t("settings.profile")}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "primary.main",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0) || "U"}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {user?.name || "User"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {user?.email || ""}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                {user?.roles?.map((role: string) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: "primary.main",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Language */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Language sx={{ color: "primary.main" }} />
            <Typography variant="h5">{t("settings.language")}</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {t("settings.languageDesc")}
          </Typography>
          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={handleLanguageChange}
            sx={{
              "& .MuiToggleButton-root": {
                px: 3,
                py: 1,
                fontWeight: 600,
                border: `1px solid ${alpha("#94a3b8", 0.15)}`,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: "primary.main",
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
              },
            }}
          >
            <ToggleButton value="es">🇪🇸 Español</ToggleButton>
            <ToggleButton value="en">🇺🇸 English</ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Palette sx={{ color: "primary.main" }} />
            <Typography variant="h5">{t("settings.appearance")}</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {t("settings.appearanceDesc")}
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleThemeChange}
            sx={{
              "& .MuiToggleButton-root": {
                px: 3,
                py: 1,
                fontWeight: 600,
                gap: 1,
                border: `1px solid ${alpha("#94a3b8", 0.15)}`,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: "primary.main",
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
              },
            }}
          >
            <ToggleButton value="light">
              <LightMode fontSize="small" />
              {t("settings.lightMode")}
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkMode fontSize="small" />
              {t("settings.darkMode")}
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Security sx={{ color: "primary.main" }} />
            <Typography variant="h5">{t("settings.security")}</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {t("settings.password")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("settings.passwordDesc")}
              </Typography>
            </Box>
            <Chip
              label={t("settings.changePwd")}
              sx={{
                bgcolor: alpha("#94a3b8", 0.12),
                color: "text.secondary",
                fontWeight: 600,
                cursor: "pointer",
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
