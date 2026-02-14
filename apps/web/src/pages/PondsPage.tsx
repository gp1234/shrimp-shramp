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
import { Add, Visibility, WaterDrop, Edit, Delete } from "@mui/icons-material";
import api from "../api";

interface Pond {
  id: string;
  code: string;
  name: string;
  area: number;
  depth: number;
  status: string;
  farmId: string;
  waterType: string;
  capacity: number | null;
  farm: { name: string };
  _count: { cycles: number; feedingLogs: number; waterQualityLogs: number };
}

interface Farm {
  id: string;
  name: string;
}

const EMPTY_POND = {
  name: "",
  code: "",
  area: "",
  depth: "",
  farmId: "",
  waterType: "BRACKISH",
  capacity: "",
  status: "PREPARING",
};

export function PondsPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPond, setEditingPond] = useState<Pond | null>(null);
  const [form, setForm] = useState(EMPTY_POND);
  const [deleteTarget, setDeleteTarget] = useState<Pond | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: ponds, isLoading } = useQuery<Pond[]>({
    queryKey: ["ponds"],
    queryFn: () => api.get("/ponds").then((r) => r.data.data),
  });

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["farms"],
    queryFn: () => api.get("/farms").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/ponds", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ponds"] });
      setDialogOpen(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/ponds/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ponds"] });
      setDialogOpen(false);
      setEditingPond(null);
      setSnack({ msg: t("crud.updated"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/ponds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ponds"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCreate = () => {
    setEditingPond(null);
    setForm({ ...EMPTY_POND, farmId: farms?.[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (pond: Pond) => {
    setEditingPond(pond);
    setForm({
      name: pond.name,
      code: pond.code,
      area: String(pond.area),
      depth: String(pond.depth || ""),
      farmId: pond.farmId,
      waterType: pond.waterType || "BRACKISH",
      capacity: pond.capacity != null ? String(pond.capacity) : "",
      status: pond.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      code: form.code,
      area: parseFloat(form.area),
      depth: form.depth ? parseFloat(form.depth) : null,
      farmId: form.farmId,
      waterType: form.waterType,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      status: form.status,
    };
    if (editingPond) {
      updateMut.mutate({ id: editingPond.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "#4caf50",
    INACTIVE: "#94a3b8",
    MAINTENANCE: "#ff9800",
    DECOMMISSIONED: "#f44336",
    PREPARING: "#2bb5d2",
    HARVESTING: "#ff9800",
  };

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
            {t("ponds.title")}
          </Typography>
          <Typography variant="body2">{t("ponds.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreate}
        >
          {t("ponds.addPond")}
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={220} />
                </Grid>
              ))
          : ponds?.map((pond) => (
              <Grid key={pond.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: statusColors[pond.status] || "#94a3b8",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.05)})`,
                            color: "primary.main",
                          }}
                        >
                          <WaterDrop />
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {pond.code}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {pond.name}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Chip
                          label={t(`status.${pond.status}`, pond.status)}
                          size="small"
                          sx={{
                            background: alpha(
                              statusColors[pond.status] || "#94a3b8",
                              0.15,
                            ),
                            color: statusColors[pond.status] || "#94a3b8",
                            fontWeight: 600,
                            fontSize: "0.65rem",
                          }}
                        />
                        <Tooltip title={t("crud.edit")}>
                          <IconButton
                            size="small"
                            onClick={() => openEdit(pond)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("crud.delete")}>
                          <IconButton
                            size="small"
                            sx={{ color: "#f44336" }}
                            onClick={() => setDeleteTarget(pond)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", display: "block" }}
                        >
                          {t("ponds.area")}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pond.area} ha
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", display: "block" }}
                        >
                          {t("ponds.depth")}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pond.depth}m
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", display: "block" }}
                        >
                          {t("ponds.cycles")}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pond._count.cycles}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        {t("ponds.feedings", {
                          count: pond._count.feedingLogs,
                        })}{" "}
                        •{" "}
                        {t("ponds.wqReadings", {
                          count: pond._count.waterQualityLogs,
                        })}
                      </Typography>
                      <Tooltip title={t("ponds.viewDetails")}>
                        <IconButton size="small" sx={{ color: "primary.main" }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPond ? t("crud.edit") : t("ponds.addPond")}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            label={t("crud.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t("crud.code")}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            fullWidth
            required
          />
          <TextField
            select
            label={t("crud.farm")}
            value={form.farmId}
            onChange={(e) => setForm({ ...form, farmId: e.target.value })}
            fullWidth
            required
          >
            {farms?.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={`${t("ponds.area")} (ha)`}
              type="number"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={`${t("ponds.depth")} (m)`}
              type="number"
              value={form.depth}
              onChange={(e) => setForm({ ...form, depth: e.target.value })}
              fullWidth
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label={t("crud.waterType")}
              value={form.waterType}
              onChange={(e) => setForm({ ...form, waterType: e.target.value })}
              fullWidth
            >
              <MenuItem value="FRESHWATER">{t("crud.freshwater")}</MenuItem>
              <MenuItem value="SALTWATER">{t("crud.saltwater")}</MenuItem>
              <MenuItem value="BRACKISH">{t("crud.brackish")}</MenuItem>
            </TextField>
            <TextField
              label={t("crud.capacity")}
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              fullWidth
            />
          </Box>
          {editingPond && (
            <TextField
              select
              label={t("table.status")}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              fullWidth
            >
              {[
                "ACTIVE",
                "INACTIVE",
                "MAINTENANCE",
                "PREPARING",
                "HARVESTING",
                "DECOMMISSIONED",
              ].map((s) => (
                <MenuItem key={s} value={s}>
                  {t(`status.${s}`, s)}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.name || !form.code || !form.area || !form.farmId}
          >
            {editingPond ? t("crud.save") : t("crud.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("crud.confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("crud.deleteMsg", { name: deleteTarget?.name || "" })}
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
