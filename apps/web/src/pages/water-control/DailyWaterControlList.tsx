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
  Chip,
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

interface DailyWaterControl {
  id: string;
  recordDate: string;
  recordTime: string;
  farmSection: string | null;
  entries: { pondId: string; pond: { name: string; code: string } }[];
}

export function DailyWaterControlList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<DailyWaterControl | null>(
    null,
  );
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data, isLoading } = useQuery<{
    data: DailyWaterControl[];
    pagination: { total: number };
  }>({
    queryKey: ["daily-water-controls", farmId, page, rowsPerPage],
    queryFn: () =>
      api
        .get("/water-control", {
          params: { farmId, page: page + 1, limit: rowsPerPage },
        })
        .then((r) => r.data),
    enabled: !!farmId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/water-control/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-water-controls"] });
      setDeleteTarget(null);
      setSnack({ msg: t("crud.deleted"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const records = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <Box>
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
            {t("waterControl.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("waterControl.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={() => navigate("/water-control/new")}
        >
          {t("waterControl.new")}
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("waterControl.date")}</TableCell>
                <TableCell>{t("waterControl.time")}</TableCell>
                <TableCell>{t("waterControl.farmSection")}</TableCell>
                <TableCell align="right">
                  {t("waterControl.pondsRecorded")}
                </TableCell>
                <TableCell align="right">
                  {t("waterControl.actions")}
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
                    // Count unique ponds
                    const uniquePonds = new Set(
                      row.entries.map((e) => e.pondId),
                    ).size;

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/water-control/${row.id}`)}
                      >
                        <TableCell>
                          {new Date(row.recordDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.recordTime}
                            size="small"
                            color={
                              row.recordTime === "AM" ? "primary" : "warning"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {row.farmSection || "—"}
                        </TableCell>
                        <TableCell align="right">{uniquePonds}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={t("crud.edit")}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/water-control/${row.id}`);
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
                      {t("waterControl.noData")}
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
                ? `${new Date(deleteTarget.recordDate).toLocaleDateString()} ${deleteTarget.recordTime}`
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
