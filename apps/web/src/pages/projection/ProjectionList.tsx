import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFarm } from "../../contexts/FarmContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  SelectChangeEvent,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "info"> = {
  draft: "warning",
  approved: "info",
  completed: "success",
};

interface Pond {
  id: string;
  name: string;
  area: number;
}

function snapToFriday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

export function ProjectionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    date: string;
  } | null>(null);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [weekDate, setWeekDate] = useState(() =>
    toDateStr(snapToFriday(new Date())),
  );
  const [supplier, setSupplier] = useState("");
  const [selectedPonds, setSelectedPonds] = useState<string[]>([]);

  // ── Queries ──

  const { data, isLoading } = useQuery({
    queryKey: ["projections", farmId, page, rowsPerPage, statusFilter],
    queryFn: () =>
      api
        .get("/projection/weekly", {
          params: {
            farmId,
            page: page + 1,
            limit: rowsPerPage,
            ...(statusFilter ? { status: statusFilter } : {}),
          },
        })
        .then((r) => r.data),
    enabled: !!farmId,
  });

  const { data: suppliers = [] } = useQuery<string[]>({
    queryKey: ["projection-suppliers", farmId],
    queryFn: () =>
      api
        .get("/projection/suppliers", { params: { farmId } })
        .then((r) => r.data.data),
    enabled: !!farmId && createOpen,
  });

  const { data: ponds = [] } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId && createOpen,
  });

  // ── Mutations ──

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/projection/weekly/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projections"] });
      setSnack({ msg: t("crud.deleted"), severity: "success" });
      setDeleteTarget(null);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/projection/weekly", data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projections"] });
      setSnack({ msg: t("crud.created"), severity: "success" });
      setCreateOpen(false);
      const newId = res.data.data.id;
      setTimeout(() => navigate(`/projection/${newId}`), 400);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const handleCreate = () => {
    if (!farmId || !supplier || selectedPonds.length === 0) return;
    createMut.mutate({
      farmId,
      weekStartDate: weekDate,
      supplierName: supplier,
      pondIds: selectedPonds,
    });
  };

  const rows = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t("projection.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("projection.subtitle")}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          {t("projection.new")}
        </Button>
      </Box>

      {/* Status filter */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          size="small"
        >
          <ToggleButton value={null as any}>
            {t("projection.filterAll")}
          </ToggleButton>
          <ToggleButton value="draft">
            {t("projection.status.draft")}
          </ToggleButton>
          <ToggleButton value="approved">
            {t("projection.status.approved")}
          </ToggleButton>
          <ToggleButton value="completed">
            {t("projection.status.completed")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("projection.weekRange")}</TableCell>
              <TableCell>{t("projection.supplier")}</TableCell>
              <TableCell align="right">{t("projection.totalFeedKg")}</TableCell>
              <TableCell align="center">{t("projection.pondCount")}</TableCell>
              <TableCell>{t("table.status")}</TableCell>
              <TableCell align="center">{t("alerts.title")}</TableCell>
              <TableCell>{t("projection.createdBy")}</TableCell>
              <TableCell align="right">{t("waterControl.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t("projection.noData")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row: any) => (
              <ProjectionRow
                key={row.id}
                row={row}
                t={t}
                onView={() => navigate(`/projection/${row.id}`)}
                onDelete={() =>
                  setDeleteTarget({
                    id: row.id,
                    date: new Date(row.weekStartDate).toLocaleDateString(
                      "es-EC",
                    ),
                  })
                }
              />
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage={t("projection.rowsPerPage")}
        />
      </TableContainer>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("projection.new")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={t("projection.weekStart")}
              type="date"
              size="small"
              fullWidth
              value={weekDate}
              onChange={(e) => {
                const d = new Date(e.target.value);
                setWeekDate(toDateStr(snapToFriday(d)));
              }}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>{t("projection.supplier")}</InputLabel>
              <Select
                value={supplier}
                label={t("projection.supplier")}
                onChange={(e: SelectChangeEvent) => setSupplier(e.target.value)}
              >
                {suppliers.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{t("projection.selectPonds")}</InputLabel>
              <Select
                multiple
                value={selectedPonds}
                label={t("projection.selectPonds")}
                onChange={(e) =>
                  setSelectedPonds(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : (e.target.value as string[]),
                  )
                }
                renderValue={(sel) =>
                  ponds
                    .filter((p) => sel.includes(p.id))
                    .map((p) => p.name)
                    .join(", ")
                }
              >
                {ponds.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.area} HA)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !supplier || selectedPonds.length === 0 || createMut.isPending
            }
            startIcon={
              createMut.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AddIcon />
              )
            }
          >
            {t("projection.generate")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t("crud.confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("crud.deleteMsg", { name: deleteTarget?.date ?? "" })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {t("crud.cancel")}
          </Button>
          <Button
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
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

// ── Row with lazy alert count ──

function ProjectionRow({
  row,
  t,
  onView,
  onDelete,
}: {
  row: any;
  t: (key: string) => string;
  onView: () => void;
  onDelete: () => void;
}) {
  // Fetch analysis to get alert counts — only for non-draft
  const { data: analyses } = useQuery<any[]>({
    queryKey: ["projection-analysis", row.id],
    queryFn: () =>
      api
        .get(`/projection/weekly/${row.id}/analysis`)
        .then((r) => r.data.data),
    enabled: row.status !== "draft",
    staleTime: 60_000,
  });

  const warnings =
    analyses?.filter((a: any) => a.alertLevel === "warning").length ?? 0;
  const criticals =
    analyses?.filter((a: any) => a.alertLevel === "critical").length ?? 0;

  // Count ponds from the feedProjectionPondDays via the analysis or fallback
  const pondCount =
    analyses?.length ?? row._count?.feedProjectionPondDays ?? "—";

  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={onView}>
      <TableCell>
        {new Date(row.weekStartDate).toLocaleDateString("es-EC")}
        {" — "}
        {new Date(row.weekEndDate).toLocaleDateString("es-EC")}
      </TableCell>
      <TableCell>{row.supplierName}</TableCell>
      <TableCell align="right">
        {row.totalWeeklyFeedKg?.toLocaleString("es-EC", {
          maximumFractionDigits: 1,
        }) ?? "—"}
      </TableCell>
      <TableCell align="center">
        {typeof pondCount === "number" ? pondCount : "—"}
      </TableCell>
      <TableCell>
        <Chip
          label={t(`projection.status.${row.status}`)}
          color={STATUS_COLORS[row.status] ?? "default"}
          size="small"
        />
      </TableCell>
      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
        {criticals > 0 && (
          <Chip
            icon={<ErrorIcon sx={{ fontSize: 14 }} />}
            label={criticals}
            color="error"
            size="small"
            sx={{ mr: 0.5, height: 22, fontSize: "0.7rem" }}
          />
        )}
        {warnings > 0 && (
          <Chip
            icon={<WarningIcon sx={{ fontSize: 14 }} />}
            label={warnings}
            color="warning"
            size="small"
            sx={{ height: 22, fontSize: "0.7rem" }}
          />
        )}
        {criticals === 0 && warnings === 0 && row.status !== "draft" && analyses && (
          <Chip
            label="OK"
            color="success"
            size="small"
            sx={{ height: 22, fontSize: "0.7rem" }}
          />
        )}
      </TableCell>
      <TableCell>{row.createdBy?.name ?? "—"}</TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Tooltip title={t("crud.edit")}>
          <IconButton size="small" onClick={onView}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {row.status === "draft" && (
          <Tooltip title={t("crud.delete")}>
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}
