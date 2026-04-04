import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Card,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import api from "../../api";
import { useFarm } from "../../contexts/FarmContext";

interface PreweightEntry {
  growthRate: number;
  averageWeight: number;
  totalNumber: number;
  pond: { name: string; code: string };
}

interface WeeklyPreweight {
  id: string;
  samplingDate: string;
  notes: string | null;
  entries: PreweightEntry[];
}

export function PreweightList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyPreweight | null>(
    null,
  );
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data, isLoading } = useQuery<{
    data: WeeklyPreweight[];
    pagination: { total: number; totalPages: number };
  }>({
    queryKey: ["weekly-preweights", farmId, page, rowsPerPage],
    queryFn: () =>
      api
        .get("/sampling/preweight", {
          params: { farmId, page: page + 1, limit: rowsPerPage },
        })
        .then((r) => r.data),
    enabled: !!farmId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/sampling/preweight/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-preweights"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const records = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t("sampling.preweight.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("sampling.preweight.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={() => navigate("/sampling/preweight/new")}
        >
          {t("sampling.preweight.new")}
        </Button>
      </Box>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("sampling.preweight.date")}</TableCell>
                <TableCell align="right">
                  {t("sampling.preweight.pondsCount")}
                </TableCell>
                <TableCell align="right">
                  {t("sampling.preweight.avgGrowth")}
                </TableCell>
                <TableCell align="right">
                  {t("sampling.preweight.avgWeight")}
                </TableCell>
                <TableCell align="right">
                  {t("sampling.preweight.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(5)
                          .fill(0)
                          .map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                : records.map((row) => {
                    const pondCount = row.entries.length;
                    const avgGrowth =
                      pondCount > 0
                        ? row.entries.reduce(
                            (s, e) => s + e.growthRate,
                            0,
                          ) / pondCount
                        : 0;
                    const avgWeight =
                      pondCount > 0
                        ? row.entries.reduce(
                            (s, e) => s + e.averageWeight,
                            0,
                          ) / pondCount
                        : 0;

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(`/sampling/preweight/${row.id}`)
                        }
                      >
                        <TableCell>
                          {new Date(row.samplingDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">{pondCount}</TableCell>
                        <TableCell align="right">
                          {avgGrowth.toFixed(2)} g/sem
                        </TableCell>
                        <TableCell align="right">
                          {avgWeight.toFixed(2)} g
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={t("crud.edit")}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sampling/preweight/${row.id}`);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("crud.delete")}>
                            <IconButton
                              size="small"
                              sx={{ color: "#f44336" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(row);
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isLoading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("sampling.preweight.noData")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Card>

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
            {t("crud.deleteMsg", {
              name: deleteTarget
                ? new Date(deleteTarget.samplingDate).toLocaleDateString()
                : "",
            })}
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
