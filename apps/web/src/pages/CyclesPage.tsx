import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Box,
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
import { Add, Visibility, Loop, Edit, Delete } from "@mui/icons-material";
import api from "../api";

interface Pond {
  id: string;
  name: string;
  code: string;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
  species: string;
  startDate: string;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  initialStock: number | null;
  stockDensity: number | null;
  targetWeight: number | null;
  pondId: string;
  notes: string | null;
  pond: { name: string; code: string; area: number };
  _count: {
    feedingLogs: number;
    mortalityRecords: number;
    harvestRecords: number;
  };
}

const EMPTY_CYCLE = {
  name: "",
  pondId: "",
  species: "Litopenaeus vannamei",
  startDate: new Date().toISOString().slice(0, 10),
  expectedEndDate: "",
  initialStock: "",
  stockDensity: "",
  targetWeight: "",
  notes: "",
};

export function CyclesPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cycle | null>(null);
  const [form, setForm] = useState(EMPTY_CYCLE);
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: cycles, isLoading } = useQuery<Cycle[]>({
    queryKey: ["cycles"],
    queryFn: () => api.get("/cycles").then((r) => r.data.data),
  });

  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list"],
    queryFn: () => api.get("/ponds").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/cycles", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cycles"] });
      setDialogOpen(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/cycles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cycles"] });
      setDialogOpen(false);
      setEditing(null);
      setSnack({ msg: t("crud.updated"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/cycles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cycles"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_CYCLE, pondId: ponds?.[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Cycle) => {
    setEditing(c);
    setForm({
      name: c.name,
      pondId: c.pondId,
      species: c.species,
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      expectedEndDate: c.expectedEndDate ? c.expectedEndDate.slice(0, 10) : "",
      initialStock: c.initialStock != null ? String(c.initialStock) : "",
      stockDensity: c.stockDensity != null ? String(c.stockDensity) : "",
      targetWeight: c.targetWeight != null ? String(c.targetWeight) : "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload: any = {
      name: form.name,
      pondId: form.pondId,
      species: form.species,
      startDate: new Date(form.startDate).toISOString(),
      notes: form.notes || null,
    };
    if (form.expectedEndDate)
      payload.expectedEndDate = new Date(form.expectedEndDate).toISOString();
    if (form.initialStock) payload.initialStock = parseInt(form.initialStock);
    if (form.stockDensity) payload.stockDensity = parseFloat(form.stockDensity);
    if (form.targetWeight) payload.targetWeight = parseFloat(form.targetWeight);

    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const statusColors: Record<string, string> = {
    PLANNING: "#94a3b8",
    STOCKING: "#00a7ca",
    GROWING: "#4caf50",
    HARVESTING: "#ff9800",
    COMPLETED: "#2bb5d2",
    CANCELLED: "#f44336",
  };

  const getDaysInCycle = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
            {t("cycles.title")}
          </Typography>
          <Typography variant="body2">{t("cycles.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreate}
        >
          {t("cycles.newCycle")}
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {isLoading
          ? Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} variant="rounded" height={140} />
              ))
          : cycles?.map((cycle) => (
              <Card key={cycle.id}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `linear-gradient(135deg, ${alpha(statusColors[cycle.status] || "#94a3b8", 0.2)}, ${alpha(statusColors[cycle.status] || "#94a3b8", 0.05)})`,
                          color: statusColors[cycle.status] || "#94a3b8",
                        }}
                      >
                        <Loop />
                      </Box>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {cycle.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {cycle.pond.code} — {cycle.pond.name} •{" "}
                          {cycle.pond.area} ha
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Chip
                        label={t(`status.${cycle.status}`, cycle.status)}
                        size="small"
                        sx={{
                          background: alpha(
                            statusColors[cycle.status] || "#94a3b8",
                            0.15,
                          ),
                          color: statusColors[cycle.status] || "#94a3b8",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      />
                      <Tooltip title={t("crud.edit")}>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(cycle)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("crud.delete")}>
                        <IconButton
                          size="small"
                          sx={{ color: "#f44336" }}
                          onClick={() => setDeleteTarget(cycle)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", gap: 4, mt: 2.5, flexWrap: "wrap" }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.days")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {getDaysInCycle(cycle.startDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.density")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {cycle.stockDensity} /m²
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.targetWeight")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {cycle.targetWeight}g
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.feedings")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {cycle._count.feedingLogs}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.harvests")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {cycle._count.harvestRecords}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("cycles.startDate")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {new Date(cycle.startDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editing ? t("crud.edit") : t("cycles.newCycle")}
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
            label={t("crud.species")}
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("cycles.startDate")}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label={t("crud.expectedEnd")}
              type="date"
              value={form.expectedEndDate}
              onChange={(e) =>
                setForm({ ...form, expectedEndDate: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("crud.initialStock")}
              type="number"
              value={form.initialStock}
              onChange={(e) =>
                setForm({ ...form, initialStock: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={`${t("cycles.density")} (/m²)`}
              type="number"
              value={form.stockDensity}
              onChange={(e) =>
                setForm({ ...form, stockDensity: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={`${t("cycles.targetWeight")} (g)`}
              type="number"
              value={form.targetWeight}
              onChange={(e) =>
                setForm({ ...form, targetWeight: e.target.value })
              }
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
            disabled={!form.name || !form.pondId || !form.startDate}
          >
            {editing ? t("crud.save") : t("crud.create")}
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
