import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  IconButton,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import api from "../../api";
import { useFarm } from "../../contexts/FarmContext";
import { useState } from "react";

interface Pond {
  id: string;
  name: string;
  code: string;
  area: number;
}

interface FormValues {
  pondId: string;
  samplingDate: string;
  hectares: string;
  stockingCount: string;
  gridColumns: number;
  entradaRows: number;
  salidaRows: number;
  castNetCounts: string[][];
  averageWeight: string;
  waterLevel: string;
  oldMolts: string;
  freshMolts: string;
  diseaseCount: string;
  observations: string;
}

const DEFAULT_GRID_COLS = 4;
const DEFAULT_ENTRADA_ROWS = 5;
const DEFAULT_SALIDA_ROWS = 1;

function buildEmptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

export function PopulationSamplingForm() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;

  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const totalRows = DEFAULT_ENTRADA_ROWS + DEFAULT_SALIDA_ROWS;

  const { register, handleSubmit, setValue, control, reset } =
    useForm<FormValues>({
      defaultValues: {
        pondId: "",
        samplingDate: new Date().toISOString().slice(0, 10),
        hectares: "",
        stockingCount: "",
        gridColumns: DEFAULT_GRID_COLS,
        entradaRows: DEFAULT_ENTRADA_ROWS,
        salidaRows: DEFAULT_SALIDA_ROWS,
        castNetCounts: buildEmptyGrid(totalRows, DEFAULT_GRID_COLS),
        averageWeight: "",
        waterLevel: "",
        oldMolts: "",
        freshMolts: "",
        diseaseCount: "",
        observations: "",
      },
    });

  const watched = useWatch({ control });

  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  // Fetch existing record for edit mode
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["population-sampling", id],
    queryFn: () =>
      api.get(`/sampling/population/${id}`).then((r) => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const counts: number[] = existing.castNetCounts || [];
      const cols = existing.gridColumns || DEFAULT_GRID_COLS;
      const rows = (existing.entradaRows || DEFAULT_ENTRADA_ROWS) + (existing.salidaRows || DEFAULT_SALIDA_ROWS);
      const grid: string[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < cols; c++) {
          const val = counts[r * cols + c];
          row.push(val !== undefined && val !== 0 ? String(val) : "");
        }
        grid.push(row);
      }
      reset({
        pondId: existing.pondId,
        samplingDate: existing.samplingDate?.slice(0, 10) || "",
        hectares: String(existing.hectares),
        stockingCount: String(existing.stockingCount),
        gridColumns: cols,
        entradaRows: existing.entradaRows || DEFAULT_ENTRADA_ROWS,
        salidaRows: existing.salidaRows || DEFAULT_SALIDA_ROWS,
        castNetCounts: grid,
        averageWeight: String(existing.averageWeight),
        waterLevel: String(existing.waterLevel),
        oldMolts: existing.oldMolts ? String(existing.oldMolts) : "",
        freshMolts: existing.freshMolts ? String(existing.freshMolts) : "",
        diseaseCount: existing.diseaseCount ? String(existing.diseaseCount) : "",
        observations: existing.observations || "",
      });
    }
  }, [existing, reset]);

  // Auto-calculations
  const calculations = useMemo(() => {
    const grid = watched.castNetCounts || [];
    const flatCounts = grid
      .flat()
      .map((v) => parseInt(v as string) || 0);
    const totalCount = flatCounts.reduce((a, b) => a + b, 0);
    const numberOfThrows = flatCounts.filter((v) => v > 0).length;
    const countPerThrow = numberOfThrows > 0 ? totalCount / numberOfThrows : 0;
    const shrimpPerSqMeter = countPerThrow;

    const oldMolts = parseInt(watched.oldMolts as string) || 0;
    const freshMolts = parseInt(watched.freshMolts as string) || 0;
    const disease = parseInt(watched.diseaseCount as string) || 0;

    const oldMoltsPercent = totalCount > 0 ? (oldMolts / totalCount) * 100 : 0;
    const freshMoltsPercent =
      totalCount > 0 ? (freshMolts / totalCount) * 100 : 0;
    const diseasePercent = totalCount > 0 ? (disease / totalCount) * 100 : 0;

    // Row subtotals
    const rowSubtotals = grid.map((row: any) =>
      (row as string[]).reduce(
        (sum: number, v: string) => sum + (parseInt(v) || 0),
        0,
      ),
    );

    return {
      totalCount,
      numberOfThrows,
      countPerThrow,
      shrimpPerSqMeter,
      oldMoltsPercent,
      freshMoltsPercent,
      diseasePercent,
      rowSubtotals,
    };
  }, [watched.castNetCounts, watched.oldMolts, watched.freshMolts, watched.diseaseCount]);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/sampling/population", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["population-samplings"] });
      setSnack({ msg: t("crud.created"), severity: "success" });
      setTimeout(() => navigate("/sampling/population"), 500);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/sampling/population/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["population-samplings"] });
      qc.invalidateQueries({ queryKey: ["population-sampling", id] });
      setSnack({ msg: t("crud.updated"), severity: "success" });
      setTimeout(() => navigate("/sampling/population"), 500);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const onSubmit = (data: FormValues) => {
    const flatCounts = data.castNetCounts
      .flat()
      .map((v) => parseInt(v) || 0);

    const payload = {
      farmId,
      pondId: data.pondId,
      samplingDate: new Date(data.samplingDate).toISOString(),
      hectares: parseFloat(data.hectares),
      stockingCount: parseInt(data.stockingCount),
      castNetCounts: flatCounts,
      gridColumns: data.gridColumns,
      entradaRows: data.entradaRows,
      salidaRows: data.salidaRows,
      numberOfThrows: calculations.numberOfThrows,
      averageWeight: parseFloat(data.averageWeight),
      waterLevel: parseFloat(data.waterLevel),
      oldMolts: parseInt(data.oldMolts) || 0,
      freshMolts: parseInt(data.freshMolts) || 0,
      diseaseCount: parseInt(data.diseaseCount) || 0,
      observations: data.observations || undefined,
    };

    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <Box>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  const gridCols = watched.gridColumns || DEFAULT_GRID_COLS;
  const entradaRows = watched.entradaRows || DEFAULT_ENTRADA_ROWS;
  const salidaRows = watched.salidaRows || DEFAULT_SALIDA_ROWS;
  const gridRows = entradaRows + salidaRows;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ maxWidth: 600, mx: "auto" }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate("/sampling/population")}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("sampling.population.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? t("sampling.population.editSubtitle")
              : t("sampling.population.newSubtitle")}
          </Typography>
        </Box>
      </Box>

      {/* Pond + Date */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          select
          label={t("sampling.population.pond")}
          size="small"
          fullWidth
          value={watched.pondId || ""}
          {...register("pondId", { required: true })}
          onChange={(e) => {
            setValue("pondId", e.target.value);
            const pond = ponds?.find((p) => p.id === e.target.value);
            if (pond) setValue("hectares", String(pond.area));
          }}
        >
          {ponds?.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t("sampling.population.date")}
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          {...register("samplingDate", { required: true })}
        />
      </Box>

      {/* Hectares + Stocking Count */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label={t("sampling.population.hectares")}
          type="number"
          size="small"
          fullWidth
          inputProps={{ step: "0.01" }}
          {...register("hectares", { required: true })}
        />
        <TextField
          label={t("sampling.population.stockingCount")}
          type="number"
          size="small"
          fullWidth
          {...register("stockingCount", { required: true })}
        />
      </Box>

      {/* Cast Net Grid */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, textTransform: "uppercase" }}
          >
            {t("sampling.population.castNetGrid")}
          </Typography>

          {/* Grid rows */}
          {Array.from({ length: gridRows }, (_, r) => (
            <Box
              key={r}
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr) 50px`,
                gap: 0.5,
                mb: 0.5,
              }}
            >
              {Array.from({ length: gridCols }, (_, c) => (
                <TextField
                  key={c}
                  size="small"
                  type="number"
                  inputProps={{
                    min: 0,
                    style: {
                      textAlign: "center",
                      padding: "6px 4px",
                      fontSize: "0.85rem",
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { minWidth: 0 } }}
                  {...register(`castNetCounts.${r}.${c}`)}
                />
              ))}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                >
                  {calculations.rowSubtotals[r] || 0}
                </Typography>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card
        sx={{
          mb: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.04)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("sampling.population.totalCount")} (#AV)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {calculations.totalCount}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("sampling.population.numberOfThrows")} (LC)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {calculations.numberOfThrows}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("sampling.population.countPerThrow")} (C/L)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {calculations.countPerThrow.toFixed(1)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("sampling.population.shrimpPerSqMeter")} (CM/MT&sup2;)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {calculations.shrimpPerSqMeter.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Weight + Water Level */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label={`${t("sampling.population.avgWeight")} (g)`}
          type="number"
          size="small"
          fullWidth
          inputProps={{ step: "0.01" }}
          {...register("averageWeight", { required: true })}
        />
        <TextField
          label={`${t("sampling.population.waterLevel")} (m)`}
          type="number"
          size="small"
          fullWidth
          inputProps={{ step: "0.01" }}
          {...register("waterLevel", { required: true })}
        />
      </Box>

      {/* Health: Molts + Disease */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, textTransform: "uppercase" }}
          >
            {t("sampling.population.health")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                label={t("sampling.population.oldMolts")}
                type="number"
                size="small"
                fullWidth
                {...register("oldMolts")}
              />
              <Typography
                variant="body2"
                sx={{ minWidth: 55, fontWeight: 600, textAlign: "right" }}
              >
                {calculations.oldMoltsPercent.toFixed(1)}%
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                label={t("sampling.population.freshMolts")}
                type="number"
                size="small"
                fullWidth
                {...register("freshMolts")}
              />
              <Typography
                variant="body2"
                sx={{ minWidth: 55, fontWeight: 600, textAlign: "right" }}
              >
                {calculations.freshMoltsPercent.toFixed(1)}%
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                label={t("sampling.population.disease")}
                type="number"
                size="small"
                fullWidth
                {...register("diseaseCount")}
              />
              <Typography
                variant="body2"
                sx={{ minWidth: 55, fontWeight: 600, textAlign: "right" }}
              >
                {calculations.diseasePercent.toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Observations */}
      <TextField
        label={t("sampling.population.observations")}
        size="small"
        fullWidth
        multiline
        rows={3}
        sx={{ mb: 3 }}
        {...register("observations")}
      />

      {/* Save Button */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        startIcon={<Save />}
        disabled={createMut.isPending || updateMut.isPending}
        sx={{ py: 1.5, mb: 2 }}
      >
        {createMut.isPending || updateMut.isPending
          ? t("sampling.population.saving")
          : t("crud.save")}
      </Button>

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
