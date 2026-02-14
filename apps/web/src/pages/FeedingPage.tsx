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
import { Add, Restaurant, Schedule, Edit, Delete } from "@mui/icons-material";
import api from "../api";

interface FeedType {
  id: string;
  name: string;
  brand: string | null;
  proteinPct: number | null;
}

interface Pond {
  id: string;
  name: string;
  code: string;
}

interface FeedingLog {
  id: string;
  date: string;
  quantity: number;
  mealNumber: number | null;
  notes: string | null;
  pondId: string;
  feedTypeId: string;
  feedType: FeedType;
  pond: { name: string; code: string };
}

const EMPTY_FORM = {
  pondId: "",
  feedTypeId: "",
  date: new Date().toISOString().slice(0, 10),
  quantity: "",
  mealNumber: "",
  notes: "",
};

export function FeedingPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeedingLog | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<FeedingLog | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: logs, isLoading } = useQuery<FeedingLog[]>({
    queryKey: ["feeding-logs"],
    queryFn: () => api.get("/feeding/logs").then((r) => r.data.data),
  });

  const { data: feedTypes } = useQuery<FeedType[]>({
    queryKey: ["feed-types"],
    queryFn: () => api.get("/feeding/types").then((r) => r.data.data),
  });

  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list"],
    queryFn: () => api.get("/ponds").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/feeding/logs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feeding-logs"] });
      setDialogOpen(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/feeding/logs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feeding-logs"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      pondId: ponds?.[0]?.id || "",
      feedTypeId: feedTypes?.[0]?.id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload: any = {
      pondId: form.pondId,
      feedTypeId: form.feedTypeId,
      date: new Date(form.date).toISOString(),
      quantity: parseFloat(form.quantity),
    };
    if (form.mealNumber) payload.mealNumber = parseInt(form.mealNumber);
    if (form.notes) payload.notes = form.notes;
    createMut.mutate(payload);
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
            {t("feeding.title")}
          </Typography>
          <Typography variant="body2">{t("feeding.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreate}
        >
          {t("feeding.addLog")}
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {isLoading
          ? Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} variant="rounded" height={100} />
              ))
          : logs?.map((log) => (
              <Card key={log.id}>
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
                          width: 44,
                          height: 44,
                          borderRadius: 2.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)}, ${alpha(theme.palette.warning.main, 0.05)})`,
                          color: theme.palette.warning.main,
                        }}
                      >
                        <Restaurant />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {log.feedType.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {log.feedType.brand || ""}
                          {log.feedType.proteinPct != null
                            ? ` • ${t("feeding.protein")}: ${log.feedType.proteinPct}%`
                            : ""}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Chip
                        label={log.pond.code}
                        size="small"
                        sx={{
                          background: alpha(theme.palette.primary.main, 0.15),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip title={t("crud.delete")}>
                        <IconButton
                          size="small"
                          sx={{ color: "#f44336" }}
                          onClick={() => setDeleteTarget(log)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", gap: 4, mt: 2, flexWrap: "wrap" }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("feeding.quantity")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {log.quantity} kg
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block" }}
                      >
                        {t("feeding.pond")}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {log.pond.name}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        ml: "auto",
                      }}
                    >
                      <Schedule
                        sx={{ fontSize: 14, color: "text.secondary" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        {new Date(log.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  {log.notes && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        mt: 1,
                        display: "block",
                        fontStyle: "italic",
                      }}
                    >
                      {log.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("feeding.addLog")}</DialogTitle>
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
            select
            label={t("feeding.feedType")}
            value={form.feedTypeId}
            onChange={(e) => setForm({ ...form, feedTypeId: e.target.value })}
            fullWidth
            required
          >
            {feedTypes?.map((ft) => (
              <MenuItem key={ft.id} value={ft.id}>
                {ft.name} {ft.brand ? `(${ft.brand})` : ""}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("feeding.date")}
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label={`${t("feeding.quantity")} (kg)`}
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              fullWidth
              required
            />
          </Box>
          <TextField
            label={t("crud.mealNumber")}
            type="number"
            value={form.mealNumber}
            onChange={(e) => setForm({ ...form, mealNumber: e.target.value })}
            fullWidth
          />
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
            disabled={!form.pondId || !form.feedTypeId || !form.quantity}
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
            {t("crud.deleteMsg", { name: deleteTarget?.feedType.name || "" })}
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
