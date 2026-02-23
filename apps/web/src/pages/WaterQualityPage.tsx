import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Box,
  Grid2 as Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  alpha,
  useTheme,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add, Science, Delete } from "@mui/icons-material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import api from "../api";
import { useFarm } from "../contexts/FarmContext";

interface Pond {
  id: string;
  name: string;
  code: string;
}

interface WQLog {
  id: string;
  date: string;
  temperature: number | null;
  ph: number | null;
  dissolvedOxygen: number | null;
  salinity: number | null;
  ammonia: number | null;
  pondId: string;
  pond: { name: string; code: string };
}

const EMPTY_FORM = {
  pondId: "",
  date: new Date().toISOString().slice(0, 10),
  temperature: "",
  ph: "",
  dissolvedOxygen: "",
  salinity: "",
  ammonia: "",
  notes: "",
};

export function WaterQualityPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<WQLog | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: logs, isLoading } = useQuery<WQLog[]>({
    queryKey: ["water-quality", farmId],
    queryFn: () =>
      api
        .get("/water-quality/logs", { params: { farmId } })
        .then((r) => r.data.data),
    enabled: !!farmId,
  });

  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/water-quality/logs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["water-quality"] });
      setDialogOpen(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/water-quality/logs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["water-quality"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, pondId: ponds?.[0]?.id || "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload: any = {
      pondId: form.pondId,
      date: new Date(form.date).toISOString(),
    };
    if (form.temperature) payload.temperature = parseFloat(form.temperature);
    if (form.ph) payload.ph = parseFloat(form.ph);
    if (form.dissolvedOxygen)
      payload.dissolvedOxygen = parseFloat(form.dissolvedOxygen);
    if (form.salinity) payload.salinity = parseFloat(form.salinity);
    if (form.ammonia) payload.ammonia = parseFloat(form.ammonia);
    if (form.notes) payload.notes = form.notes;
    createMut.mutate(payload);
  };

  // Chart data — last 14 entries reversed so chronological
  const chartData =
    logs
      ?.slice(0, 14)
      .reverse()
      .map((l) => ({
        date: new Date(l.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        temp: l.temperature,
        ph: l.ph,
        do: l.dissolvedOxygen,
      })) || [];

  const paramColors = {
    temp: "#ff7043",
    ph: "#42a5f5",
    do: "#66bb6a",
    salinity: "#ab47bc",
    ammonia: "#ffa726",
  } as const;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t("waterQuality.title")}
          </Typography>
          <Typography variant="body2">{t("waterQuality.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreate}
        >
          {t("waterQuality.addReading")}
        </Button>
      </Box>

      {/* Trend chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {t("waterQuality.trends")}
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={alpha(theme.palette.text.primary, 0.08)}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              />
              <RTooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: "none",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                name={t("waterQuality.temp")}
                stroke={paramColors.temp}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ph"
                name="pH"
                stroke={paramColors.ph}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="do"
                name={t("waterQuality.do")}
                stroke={paramColors.do}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Reading cards */}
      <Grid container spacing={2}>
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={120} />
                </Grid>
              ))
          : logs?.map((log) => (
              <Grid key={log.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Science sx={{ fontSize: 18, color: "primary.main" }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {log.pond.code}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {new Date(log.date).toLocaleDateString()}
                        </Typography>
                        <Tooltip title={t("crud.delete")}>
                          <IconButton
                            size="small"
                            sx={{ color: "#f44336" }}
                            onClick={() => setDeleteTarget(log)}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {log.temperature != null && (
                        <Chip
                          label={`${log.temperature}°C`}
                          size="small"
                          sx={{
                            bgcolor: alpha(paramColors.temp, 0.12),
                            color: paramColors.temp,
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                      )}
                      {log.ph != null && (
                        <Chip
                          label={`pH ${log.ph}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(paramColors.ph, 0.12),
                            color: paramColors.ph,
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                      )}
                      {log.dissolvedOxygen != null && (
                        <Chip
                          label={`DO ${log.dissolvedOxygen}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(paramColors.do, 0.12),
                            color: paramColors.do,
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                      )}
                      {log.salinity != null && (
                        <Chip
                          label={`Sal ${log.salinity}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(paramColors.salinity, 0.12),
                            color: paramColors.salinity,
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                      )}
                      {log.ammonia != null && (
                        <Chip
                          label={`NH₃ ${log.ammonia}`}
                          size="small"
                          sx={{
                            bgcolor: alpha(paramColors.ammonia, 0.12),
                            color: paramColors.ammonia,
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("waterQuality.addReading")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            select
            label={t("feeding.pond")}
            value={form.pondId}
            onChange={(e) => setForm({ ...form, pondId: e.target.value })}
            fullWidth
            required
          >
            {ponds?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.code} — {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("feeding.date")}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("waterQuality.temp")}
              type="number"
              value={form.temperature}
              onChange={(e) =>
                setForm({ ...form, temperature: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="pH"
              type="number"
              value={form.ph}
              onChange={(e) => setForm({ ...form, ph: e.target.value })}
              fullWidth
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("waterQuality.do")}
              type="number"
              value={form.dissolvedOxygen}
              onChange={(e) =>
                setForm({ ...form, dissolvedOxygen: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={t("waterQuality.salinity")}
              type="number"
              value={form.salinity}
              onChange={(e) => setForm({ ...form, salinity: e.target.value })}
              fullWidth
            />
            <TextField
              label={t("waterQuality.ammonia")}
              type="number"
              value={form.ammonia}
              onChange={(e) => setForm({ ...form, ammonia: e.target.value })}
              fullWidth
            />
          </Box>
          <TextField
            label={t("crud.notes")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.pondId}
          >
            {t("crud.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("crud.confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("crud.deleteMsg", { name: deleteTarget?.pond.code || "" })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
          >
            {t("crud.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack?.severity}
          onClose={() => setSnack(null)}
          variant="filled"
        >
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
