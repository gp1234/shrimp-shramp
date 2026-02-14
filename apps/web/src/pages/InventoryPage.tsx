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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add, Inventory2, Warning, Edit, Delete } from "@mui/icons-material";
import api from "../api";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number | null;
  location: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: "",
  category: "FEED",
  unit: "kg",
  currentStock: "",
  minimumStock: "",
  costPerUnit: "",
  location: "",
};

export function InventoryPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: () => api.get("/inventory").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/inventory", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDialogOpen(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/inventory/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDialogOpen(false);
      setEditing(null);
      setSnack({ msg: t("crud.updated"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: String(item.currentStock),
      minimumStock: String(item.minimumStock),
      costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : "",
      location: item.location || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload: any = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      currentStock: parseFloat(form.currentStock || "0"),
      minimumStock: parseFloat(form.minimumStock || "0"),
    };
    if (form.costPerUnit) payload.costPerUnit = parseFloat(form.costPerUnit);
    if (form.location) payload.location = form.location;
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const lowStockItems =
    items?.filter((i) => i.currentStock <= i.minimumStock) || [];
  const categories = [...new Set(items?.map((i) => i.category) || [])];

  const getStockLevel = (item: InventoryItem) => {
    if (item.minimumStock <= 0)
      return { label: t("inventory.ok"), color: "#4caf50" };
    const ratio = item.currentStock / item.minimumStock;
    if (ratio <= 0.5)
      return { label: t("inventory.critical"), color: "#f44336" };
    if (ratio <= 1) return { label: t("inventory.low"), color: "#ff9800" };
    return { label: t("inventory.ok"), color: "#4caf50" };
  };

  const categoryLabels: Record<string, string> = {
    FEED: "Alimento",
    CHEMICAL: "Químicos",
    EQUIPMENT: "Equipo",
    SPARE_PART: "Repuestos",
    OTHER: "Otros",
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
            {t("inventory.title")}
          </Typography>
          <Typography variant="body2">{t("inventory.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreate}
        >
          {t("inventory.addItem")}
        </Button>
      </Box>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card
          sx={{
            mb: 3,
            background: alpha("#f44336", 0.08),
            border: `1px solid ${alpha("#f44336", 0.2)}`,
          }}
        >
          <CardContent
            sx={{
              p: 2,
              "&:last-child": { pb: 2 },
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Warning sx={{ color: "#f44336" }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t("inventory.lowStockAlert", { count: lowStockItems.length })}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Items by category */}
      {categories.map((cat) => (
        <Box key={cat} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            {categoryLabels[cat] || cat}
          </Typography>
          <Grid container spacing={2}>
            {items
              ?.filter((i) => i.category === cat)
              .map((item) => {
                const level = getStockLevel(item);
                const pct =
                  item.minimumStock > 0
                    ? Math.min(
                        (item.currentStock / (item.minimumStock * 2)) * 100,
                        100,
                      )
                    : 100;
                return (
                  <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
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
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Inventory2
                              sx={{ fontSize: 18, color: level.color }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {item.name}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              label={level.label}
                              size="small"
                              sx={{
                                bgcolor: alpha(level.color, 0.12),
                                color: level.color,
                                fontWeight: 600,
                                fontSize: "0.6rem",
                              }}
                            />
                            <Tooltip title={t("crud.edit")}>
                              <IconButton
                                size="small"
                                onClick={() => openEdit(item)}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t("crud.delete")}>
                              <IconButton
                                size="small"
                                sx={{ color: "#f44336" }}
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {t("inventory.stock")}: {item.currentStock}{" "}
                            {item.unit}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            Min: {item.minimumStock} {item.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(level.color, 0.12),
                            "& .MuiLinearProgress-bar": {
                              bgcolor: level.color,
                              borderRadius: 3,
                            },
                          }}
                        />
                        {item.costPerUnit != null && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              mt: 0.5,
                              display: "block",
                            }}
                          >
                            ${item.costPerUnit.toFixed(2)} / {item.unit}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        </Box>
      ))}

      {isLoading && (
        <Grid container spacing={2}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={100} />
              </Grid>
            ))}
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editing ? t("crud.edit") : t("inventory.addItem")}
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
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label={t("crud.category")}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              fullWidth
            >
              {["FEED", "CHEMICAL", "EQUIPMENT", "SPARE_PART", "OTHER"].map(
                (c) => (
                  <MenuItem key={c} value={c}>
                    {categoryLabels[c] || c}
                  </MenuItem>
                ),
              )}
            </TextField>
            <TextField
              label={t("crud.unit")}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              fullWidth
              required
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("inventory.stock")}
              type="number"
              value={form.currentStock}
              onChange={(e) =>
                setForm({ ...form, currentStock: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Min"
              type="number"
              value={form.minimumStock}
              onChange={(e) =>
                setForm({ ...form, minimumStock: e.target.value })
              }
              fullWidth
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("crud.costPerUnit")}
              type="number"
              value={form.costPerUnit}
              onChange={(e) =>
                setForm({ ...form, costPerUnit: e.target.value })
              }
              fullWidth
            />
            <TextField
              label={t("crud.location")}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.name || !form.unit}
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
