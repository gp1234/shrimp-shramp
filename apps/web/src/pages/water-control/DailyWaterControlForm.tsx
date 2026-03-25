import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  Skeleton,
  Autocomplete,
  alpha,
  useTheme,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import api from "../../api";
import { useFarm } from "../../contexts/FarmContext";

interface Pond {
  id: string;
  name: string;
  code: string;
}

const GATES = ["L1", "C", "L2"];

const WATER_COLOR_OPTIONS = [
  "Verde Claro",
  "Verde Oscuro",
  "Café Claro",
  "Café Oscuro",
  "Clara",
  "Roja",
  "Marrón",
];

interface EntryRow {
  pondId: string;
  pondLabel: string;
  gateId: string;
  gateHeightInches: string;
  turbiditySecchiCm: string;
  waterColor: string;
  observations: string;
}

interface FormValues {
  recordDate: string;
  recordTime: "AM" | "PM";
  farmSection: string;
  entries: EntryRow[];
}

function buildEntriesFromPonds(ponds: Pond[]): EntryRow[] {
  const entries: EntryRow[] = [];
  for (const pond of ponds) {
    for (const gate of GATES) {
      entries.push({
        pondId: pond.id,
        pondLabel: `${pond.code} — ${pond.name}`,
        gateId: gate,
        gateHeightInches: "",
        turbiditySecchiCm: "",
        waterColor: "",
        observations: "",
      });
    }
  }
  return entries;
}

export function DailyWaterControlForm() {
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

  const { register, handleSubmit, control, reset, setValue, getValues } =
    useForm<FormValues>({
      defaultValues: {
        recordDate: new Date().toISOString().slice(0, 10),
        recordTime: "AM",
        farmSection: "",
        entries: [],
      },
    });

  const { fields } = useFieldArray({ control, name: "entries" });
  const watched = useWatch({ control });

  const { data: ponds, isLoading: pondsLoading } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["daily-water-control", id],
    queryFn: () =>
      api.get(`/water-control/${id}`).then((r) => r.data.data),
    enabled: isEdit,
  });

  // Auto-populate entries from ponds on create
  useEffect(() => {
    if (!isEdit && ponds?.length && fields.length === 0) {
      const entries = buildEntriesFromPonds(ponds);
      reset({
        ...getValues(),
        entries,
      });
    }
  }, [ponds, isEdit, fields.length, reset, getValues]);

  // Populate from existing record on edit
  useEffect(() => {
    if (existing && ponds?.length) {
      const pondMap = new Map(ponds.map((p) => [p.id, p]));
      // Build full grid from ponds, then overlay existing entries
      const allEntries = buildEntriesFromPonds(ponds);
      for (const e of existing.entries) {
        const match = allEntries.find(
          (row) => row.pondId === e.pondId && row.gateId === e.gateId,
        );
        if (match) {
          match.gateHeightInches =
            e.gateHeightInches != null ? String(e.gateHeightInches) : "";
          match.turbiditySecchiCm =
            e.turbiditySecchiCm != null ? String(e.turbiditySecchiCm) : "";
          match.waterColor = e.waterColor || "";
          match.observations = e.observations || "";
        }
      }
      reset({
        recordDate: existing.recordDate?.slice(0, 10) || "",
        recordTime: existing.recordTime || "AM",
        farmSection: existing.farmSection || "",
        entries: allEntries,
      });
    }
  }, [existing, ponds, reset]);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/water-control", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-water-controls"] });
      setSnack({ msg: t("crud.created"), severity: "success" });
      setTimeout(() => navigate("/water-control"), 500);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.status === 409
          ? t("waterControl.duplicateError")
          : t("crud.error");
      setSnack({ msg, severity: "error" });
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/water-control/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-water-controls"] });
      qc.invalidateQueries({ queryKey: ["daily-water-control", id] });
      setSnack({ msg: t("crud.updated"), severity: "success" });
      setTimeout(() => navigate("/water-control"), 500);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const onSubmit = (data: FormValues) => {
    // Only send entries that have at least one filled value
    const entries = data.entries
      .filter(
        (e) =>
          e.gateHeightInches ||
          e.turbiditySecchiCm ||
          e.waterColor ||
          e.observations,
      )
      .map((e) => ({
        pondId: e.pondId,
        gateId: e.gateId,
        gateHeightInches: e.gateHeightInches
          ? parseFloat(e.gateHeightInches)
          : undefined,
        turbiditySecchiCm: e.turbiditySecchiCm
          ? parseFloat(e.turbiditySecchiCm)
          : undefined,
        waterColor: e.waterColor || undefined,
        observations: e.observations || undefined,
      }));

    const payload = {
      farmId,
      recordDate: new Date(data.recordDate).toISOString(),
      recordTime: data.recordTime,
      farmSection: data.farmSection || undefined,
      entries,
    };

    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  if ((isEdit && loadingExisting) || pondsLoading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  // Group entries by pond for visual grouping
  const pondGroups: { pondId: string; pondLabel: string; startIdx: number }[] =
    [];
  let lastPondId = "";
  fields.forEach((f, idx) => {
    const entry = watched.entries?.[idx];
    if (entry?.pondId !== lastPondId) {
      pondGroups.push({
        pondId: entry?.pondId || "",
        pondLabel: entry?.pondLabel || "",
        startIdx: idx,
      });
      lastPondId = entry?.pondId || "";
    }
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ maxWidth: 700, mx: "auto" }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate("/water-control")}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("waterControl.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? t("waterControl.editSubtitle")
              : t("waterControl.newSubtitle")}
          </Typography>
        </Box>
      </Box>

      {/* Date + Time + Section */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label={t("waterControl.date")}
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, minWidth: 140 }}
          {...register("recordDate", { required: true })}
        />
        <ToggleButtonGroup
          value={watched.recordTime || "AM"}
          exclusive
          onChange={(_, val) => {
            if (val) setValue("recordTime", val);
          }}
          size="small"
        >
          <ToggleButton value="AM">AM</ToggleButton>
          <ToggleButton value="PM">PM</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label={t("waterControl.farmSection")}
          size="small"
          sx={{ flex: 1, minWidth: 140 }}
          {...register("farmSection")}
        />
      </Box>

      {/* Column headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "70px 36px 65px 65px 100px 1fr",
            sm: "90px 40px 75px 75px 140px 1fr",
          },
          gap: 0.5,
          mb: 0.5,
          px: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.pond")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.gate")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.height")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.turbidity")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.color")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("waterControl.observations")}
        </Typography>
      </Box>

      {/* Entry rows */}
      {fields.map((field, idx) => {
        const entry = watched.entries?.[idx];
        const isFirstGate = entry?.gateId === "L1";
        const pondGroup = pondGroups.find((g) => g.startIdx === idx);

        return (
          <Box
            key={field.id}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "70px 36px 65px 65px 100px 1fr",
                sm: "90px 40px 75px 75px 140px 1fr",
              },
              gap: 0.5,
              mb: 0.25,
              px: 1,
              py: 0.25,
              ...(pondGroup && {
                borderTop: `1px solid ${theme.palette.divider}`,
                mt: 0.5,
                pt: 0.75,
              }),
              bgcolor: isFirstGate
                ? alpha(theme.palette.primary.main, 0.03)
                : undefined,
            }}
          >
            {/* Pond label — only on first gate */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {isFirstGate && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  noWrap
                >
                  {ponds?.find((p) => p.id === entry?.pondId)?.code || ""}
                </Typography>
              )}
            </Box>

            {/* Gate label */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  color:
                    entry?.gateId === "L1"
                      ? theme.palette.primary.main
                      : entry?.gateId === "L2"
                        ? theme.palette.warning.main
                        : "text.secondary",
                }}
              >
                {entry?.gateId}
              </Typography>
            </Box>

            {/* Height */}
            <TextField
              size="small"
              type="number"
              inputProps={{
                step: "0.1",
                style: { textAlign: "center", padding: "4px 4px", fontSize: "0.8rem" },
              }}
              {...register(`entries.${idx}.gateHeightInches`)}
            />

            {/* Turbidity — only on first gate row */}
            {isFirstGate ? (
              <TextField
                size="small"
                type="number"
                inputProps={{
                  step: "0.1",
                  style: { textAlign: "center", padding: "4px 4px", fontSize: "0.8rem" },
                }}
                {...register(`entries.${idx}.turbiditySecchiCm`)}
              />
            ) : (
              <Box />
            )}

            {/* Water Color — only on first gate row */}
            {isFirstGate ? (
              <Autocomplete
                freeSolo
                size="small"
                options={WATER_COLOR_OPTIONS}
                value={entry?.waterColor || ""}
                onInputChange={(_, val) =>
                  setValue(`entries.${idx}.waterColor`, val)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputProps={{
                      ...params.inputProps,
                      style: { padding: "2px 4px", fontSize: "0.75rem" },
                    }}
                  />
                )}
                sx={{ "& .MuiOutlinedInput-root": { py: 0 } }}
              />
            ) : (
              <Box />
            )}

            {/* Observations — only on first gate row */}
            {isFirstGate ? (
              <TextField
                size="small"
                inputProps={{
                  style: { padding: "4px 6px", fontSize: "0.75rem" },
                }}
                {...register(`entries.${idx}.observations`)}
              />
            ) : (
              <Box />
            )}
          </Box>
        );
      })}

      {fields.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("waterControl.noPonds")}
          </Typography>
        </Box>
      )}

      {/* Save */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        startIcon={<Save />}
        disabled={createMut.isPending || updateMut.isPending}
        sx={{ py: 1.5, mt: 3, mb: 2 }}
      >
        {createMut.isPending || updateMut.isPending
          ? t("waterControl.saving")
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
