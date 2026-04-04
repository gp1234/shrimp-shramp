import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  Save,
  ExpandMore,
  Add,
  Delete,
} from "@mui/icons-material";
import api from "../../api";
import { useFarm } from "../../contexts/FarmContext";

interface Pond {
  id: string;
  name: string;
  code: string;
}

interface SampleRow {
  number: string;
  weight: string;
}

interface PondEntry {
  pondId: string;
  growthRate: string;
  mortality: string;
  disease: string;
  molt: string;
  cultureDays: string;
  samples: SampleRow[];
}

interface FormValues {
  samplingDate: string;
  notes: string;
  entries: PondEntry[];
}

const EMPTY_SAMPLE: SampleRow = { number: "", weight: "" };

const EMPTY_ENTRY: PondEntry = {
  pondId: "",
  growthRate: "",
  mortality: "0",
  disease: "0",
  molt: "0",
  cultureDays: "",
  samples: [{ ...EMPTY_SAMPLE }],
};

function PondTotals({ samples }: { samples: SampleRow[] }) {
  const totalNumber = samples.reduce(
    (s, r) => s + (parseInt(r.number) || 0),
    0,
  );
  const totalWeight = samples.reduce(
    (s, r) => s + (parseFloat(r.weight) || 0),
    0,
  );
  const avg = totalNumber > 0 ? totalWeight / totalNumber : 0;
  return { totalNumber, totalWeight, avg };
}

// Inner component for one pond's sample rows — uses its own useFieldArray
function PondSamplesSection({
  entryIndex,
  control,
  register,
  watched,
  t,
  theme,
}: {
  entryIndex: number;
  control: any;
  register: any;
  watched: any;
  t: any;
  theme: any;
}) {
  const {
    fields: sampleFields,
    append: appendSample,
    remove: removeSample,
  } = useFieldArray({
    control,
    name: `entries.${entryIndex}.samples`,
  });

  const samples: SampleRow[] = watched.entries?.[entryIndex]?.samples || [];
  const { totalNumber, totalWeight, avg } = PondTotals({ samples });

  return (
    <>
      {/* Sample table header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 80px 40px",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
          {t("sampling.preweight.sampleNumber")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
          {t("sampling.preweight.sampleWeight")}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
          {t("sampling.preweight.sampleAvg")}
        </Typography>
        <Box />
      </Box>

      {/* Sample rows */}
      {sampleFields.map((field, sIdx) => {
        const num = parseInt(samples[sIdx]?.number || "0") || 0;
        const wt = parseFloat(samples[sIdx]?.weight || "0") || 0;
        const rowAvg = num > 0 ? wt / num : 0;

        return (
          <Box
            key={field.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 80px 40px",
              gap: 1,
              mb: 0.5,
            }}
          >
            <TextField
              size="small"
              type="number"
              inputProps={{ min: 0, style: { textAlign: "center" } }}
              {...register(`entries.${entryIndex}.samples.${sIdx}.number`)}
            />
            <TextField
              size="small"
              type="number"
              inputProps={{
                min: 0,
                step: "0.1",
                style: { textAlign: "center" },
              }}
              {...register(`entries.${entryIndex}.samples.${sIdx}.weight`)}
            />
            <TextField
              size="small"
              value={rowAvg > 0 ? rowAvg.toFixed(2) : ""}
              slotProps={{ input: { readOnly: true } }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: alpha(theme.palette.action.hover, 0.04),
                },
              }}
              inputProps={{ style: { textAlign: "center" } }}
            />
            <IconButton
              size="small"
              onClick={() => removeSample(sIdx)}
              disabled={sampleFields.length <= 1}
              sx={{ color: "error.main" }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        );
      })}

      {/* Add sample button */}
      <Button
        size="small"
        startIcon={<Add />}
        onClick={() => appendSample({ ...EMPTY_SAMPLE })}
        sx={{ mt: 0.5, mb: 1.5 }}
      >
        {t("sampling.preweight.addSample")}
      </Button>

      {/* Totals row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 80px 40px",
          gap: 1,
          py: 1,
          borderTop: `2px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          {totalNumber}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          {totalWeight > 0 ? totalWeight.toFixed(1) : "0"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          {avg > 0 ? avg.toFixed(2) : "—"}
        </Typography>
        <Box />
      </Box>
    </>
  );
}

export function PreweightForm() {
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
  const [expanded, setExpanded] = useState<number | false>(0);

  const { register, handleSubmit, control, reset, setValue } =
    useForm<FormValues>({
      defaultValues: {
        samplingDate: new Date().toISOString().slice(0, 10),
        notes: "",
        entries: [{ ...EMPTY_ENTRY, samples: [{ ...EMPTY_SAMPLE }] }],
      },
    });

  const {
    fields: entryFields,
    append: appendEntry,
    remove: removeEntry,
  } = useFieldArray({ control, name: "entries" });

  const watched = useWatch({ control });

  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["weekly-preweight", id],
    queryFn: () =>
      api.get(`/sampling/preweight/${id}`).then((r) => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      reset({
        samplingDate: existing.samplingDate?.slice(0, 10) || "",
        notes: existing.notes || "",
        entries: existing.entries.map((e: any) => ({
          pondId: e.pondId,
          growthRate: String(e.growthRate),
          mortality: String(e.mortality),
          disease: String(e.disease),
          molt: String(e.molt),
          cultureDays: String(e.cultureDays),
          samples: e.samples.map((s: any) => ({
            number: String(s.number),
            weight: String(s.weight),
          })),
        })),
      });
    }
  }, [existing, reset]);

  // Per-entry totals for accordion summaries
  const entryTotals = useMemo(() => {
    return (watched.entries || []).map((entry: any) => {
      const samples: SampleRow[] = entry?.samples || [];
      return PondTotals({ samples });
    });
  }, [watched.entries]);

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/sampling/preweight", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-preweights"] });
      setSnack({ msg: t("crud.created"), severity: "success" });
      setTimeout(() => navigate("/sampling/preweight"), 500);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/sampling/preweight/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-preweights"] });
      qc.invalidateQueries({ queryKey: ["weekly-preweight", id] });
      setSnack({ msg: t("crud.updated"), severity: "success" });
      setTimeout(() => navigate("/sampling/preweight"), 500);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const onSubmit = (data: FormValues) => {
    const payload = {
      farmId,
      samplingDate: new Date(data.samplingDate).toISOString(),
      notes: data.notes || undefined,
      entries: data.entries.map((entry) => ({
        pondId: entry.pondId,
        growthRate: parseFloat(entry.growthRate) || 0,
        mortality: parseInt(entry.mortality) || 0,
        disease: parseInt(entry.disease) || 0,
        molt: parseInt(entry.molt) || 0,
        cultureDays: parseInt(entry.cultureDays) || 0,
        samples: entry.samples.map((s) => ({
          number: parseInt(s.number) || 0,
          weight: parseFloat(s.weight) || 0,
        })),
      })),
    };

    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  // Ponds already selected — prevent duplicates
  const selectedPondIds = (watched.entries || []).map(
    (e: any) => e?.pondId,
  );

  if (isEdit && loadingExisting) {
    return (
      <Box>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ maxWidth: 600, mx: "auto" }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate("/sampling/preweight")}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("sampling.preweight.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEdit
              ? t("sampling.preweight.editSubtitle")
              : t("sampling.preweight.newSubtitle")}
          </Typography>
        </Box>
      </Box>

      {/* Date + Notes */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label={t("sampling.preweight.date")}
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          {...register("samplingDate", { required: true })}
        />
        <TextField
          label={t("crud.notes")}
          size="small"
          fullWidth
          {...register("notes")}
        />
      </Box>

      {/* Add Pond Button */}
      <Button
        startIcon={<Add />}
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        onClick={() => {
          appendEntry({
            ...EMPTY_ENTRY,
            samples: [{ ...EMPTY_SAMPLE }],
          });
          setExpanded(entryFields.length);
        }}
      >
        {t("sampling.preweight.addPond")}
      </Button>

      {/* Pond Accordions */}
      {entryFields.map((field, eIdx) => {
        const totals = entryTotals[eIdx] || {
          totalNumber: 0,
          totalWeight: 0,
          avg: 0,
        };
        const pondId = watched.entries?.[eIdx]?.pondId;
        const pond = ponds?.find((p) => p.id === pondId);
        const pondLabel = pond
          ? pond.name
          : t("sampling.preweight.selectPond");

        return (
          <Accordion
            key={field.id}
            expanded={expanded === eIdx}
            onChange={(_, isExp) => setExpanded(isExp ? eIdx : false)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{ "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 } }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                  {pondLabel}
                </Typography>
                {totals.totalNumber > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    n={totals.totalNumber} &middot; {totals.totalWeight.toFixed(1)}g
                    &middot; x̄={totals.avg.toFixed(2)}g
                  </Typography>
                )}
              </Box>
              {entryFields.length > 1 && (
                <Tooltip title={t("sampling.preweight.removePond")}>
                  <IconButton
                    size="small"
                    sx={{ color: "error.main" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(eIdx);
                      if (expanded === eIdx) setExpanded(false);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {/* Pond selector */}
              <TextField
                select
                label={t("sampling.preweight.pond")}
                size="small"
                fullWidth
                value={pondId || ""}
                {...register(`entries.${eIdx}.pondId`, { required: true })}
                onChange={(e) =>
                  setValue(`entries.${eIdx}.pondId`, e.target.value)
                }
                sx={{ mb: 2 }}
              >
                {ponds?.map((p) => (
                  <MenuItem
                    key={p.id}
                    value={p.id}
                    disabled={
                      selectedPondIds.includes(p.id) && p.id !== pondId
                    }
                  >
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>

              {/* Samples table */}
              <PondSamplesSection
                entryIndex={eIdx}
                control={control}
                register={register}
                watched={watched}
                t={t}
                theme={theme}
              />

              {/* Fields row */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 1.5,
                  mt: 1.5,
                }}
              >
                <TextField
                  label={t("sampling.preweight.growthRate")}
                  type="number"
                  size="small"
                  inputProps={{ step: "0.01" }}
                  {...register(`entries.${eIdx}.growthRate`)}
                />
                <TextField
                  label={t("sampling.preweight.cultureDays")}
                  type="number"
                  size="small"
                  {...register(`entries.${eIdx}.cultureDays`)}
                />
                <TextField
                  label={t("sampling.preweight.mortality")}
                  type="number"
                  size="small"
                  {...register(`entries.${eIdx}.mortality`)}
                />
                <TextField
                  label={t("sampling.preweight.disease")}
                  type="number"
                  size="small"
                  {...register(`entries.${eIdx}.disease`)}
                />
                <TextField
                  label={t("sampling.preweight.molt")}
                  type="number"
                  size="small"
                  {...register(`entries.${eIdx}.molt`)}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Save Button */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        startIcon={<Save />}
        disabled={createMut.isPending || updateMut.isPending}
        sx={{ py: 1.5, mt: 2, mb: 2 }}
      >
        {createMut.isPending || updateMut.isPending
          ? t("sampling.preweight.saving")
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
