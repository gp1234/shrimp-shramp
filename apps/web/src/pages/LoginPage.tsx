import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  alpha,
  useTheme,
} from "@mui/material";

export function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const isDev = import.meta.env.DEV;
  const [email, setEmail] = useState(isDev ? "admin@shrampi.com" : "");
  const [password, setPassword] = useState(isDev ? "Admin123!" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(ellipse at 20% 50%, ${alpha(theme.palette.primary.dark, 0.15)}, transparent 50%),
          radial-gradient(ellipse at 80% 20%, ${alpha(theme.palette.secondary.dark, 0.1)}, transparent 50%),
          ${theme.palette.background.default}
        `,
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 420,
          border: `1px solid ${alpha("#94a3b8", 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: "blur(40px)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                fontSize: "2rem",
                mb: 2,
              }}
            >
              🦐
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {t("app.name")}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {t("app.subtitle")}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </Box>

          {isDev && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: "center",
                mt: 3,
                color: "text.secondary",
              }}
            >
              {t("auth.demoCredentials")}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
