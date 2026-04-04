import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFarm } from "../../contexts/FarmContext";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "../../api";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Collapse,
  Snackbar,
  Alert,
  Skeleton,
  CircularProgress,
  alpha,
  useTheme,
  SelectChangeEvent,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import type {
  WeeklyProjectionResponse,
  PondDayProjection,
  PondWeeklySummary,
} from "@shrampi/types";
import { AlertPanel } from "../../components/projection/AlertPanel";
import { ComparisonPopover } from "../../components/projection/ComparisonPopover";

// ============================================
// Helpers
// ============================================

const REAL_DATA_BG = "#FFF9C4";
const DAY_LABELS = [
  "VIE",
  "SAB",
  "DOM",
  "LUN",
  "MAR",
  "MIE",
  "JUE",
  "VIE",
];

function snapToFriday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Friday = 5
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function fmtNum(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("es-EC", { maximumFractionDigits: 2 });
}

function fmtInt(n: number | undefined | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("es-EC");
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toFixed(2) + "%";
}

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "info"> = {
  draft: "warning",
  approved: "info",
  completed: "success",
};

// ============================================
// Types
// ============================================

interface Pond {
  id: string;
  name: string;
  code: string;
  area: number;
}

type SectionKey =
  | "peso"
  | "densidad"
  | "biomasa"
  | "bwPct"
  | "feed"
  | "khd"
  | "recambio";

// ============================================
// Editable Cell
// ============================================

function EditableCell({
  value,
  onCommit,
  disabled,
  format = "number",
}: {
  value: number;
  onCommit: (val: number) => void;
  disabled?: boolean;
  format?: "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (disabled || !editing) {
    return (
      <Box
        onClick={() => {
          if (!disabled) {
            setDraft(String(value));
            setEditing(true);
          }
        }}
        sx={{
          cursor: disabled ? "default" : "pointer",
          minWidth: 50,
          textAlign: "right",
          "&:hover": disabled ? {} : { bgcolor: "action.hover", borderRadius: 1 },
        }}
      >
        {fmtNum(value)}
      </Box>
    );
  }

  return (
    <TextField
      size="small"
      variant="standard"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(draft);
        if (!isNaN(parsed)) onCommit(parsed);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const parsed = parseFloat(draft);
          if (!isNaN(parsed)) onCommit(parsed);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      inputProps={{ style: { textAlign: "right", width: 60, fontSize: "0.8rem" } }}
    />
  );
}

// ============================================
// Weight Deviation Indicator
// ============================================

function DeviationIndicator({ day }: { day: PondDayProjection }) {
  if (!day.isRealData || day.weightDeviation == null) return null;
  const dev = day.weightDeviation;
  const absDev = Math.abs(dev);
  if (absDev <= 5) return null;

  const color = dev > 0 ? "success.main" : "error.main";
  const Icon = dev > 0 ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Tooltip
      title={`Real: ${fmtNum(day.weight)}g | Proyectado: ${fmtNum(day.weightProjected)}g | ${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}
    >
      <Icon sx={{ fontSize: 14, color, ml: 0.5, verticalAlign: "middle" }} />
    </Tooltip>
  );
}

// ============================================
// Main Component
// ============================================

export function ProjectionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;
  const qc = useQueryClient();

  // State
  const [weekDate, setWeekDate] = useState(() => toDateStr(snapToFriday(new Date())));
  const [supplier, setSupplier] = useState("");
  const [selectedPonds, setSelectedPonds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    peso: true,
    densidad: true,
    biomasa: true,
    bwPct: false,
    feed: true,
    khd: false,
    recambio: false,
  });
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const isNew = !id;

  // ── Queries ──

  const { data: suppliers = [] } = useQuery<string[]>({
    queryKey: ["projection-suppliers", farmId],
    queryFn: () =>
      api
        .get("/projection/suppliers", { params: { farmId } })
        .then((r) => r.data.data),
    enabled: !!farmId,
  });

  const { data: ponds = [] } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const {
    data: projection,
    isLoading: loadingProjection,
  } = useQuery<WeeklyProjectionResponse>({
    queryKey: ["projection-detail", id],
    queryFn: () =>
      api.get(`/projection/weekly/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  // Analysis data for comparison popovers (keyed by pondId)
  const { data: analysisData } = useQuery<any[]>({
    queryKey: ["projection-analysis", id],
    queryFn: () =>
      api.get(`/projection/weekly/${id}/analysis`).then((r) => r.data.data),
    enabled: !!id,
  });

  const analysisByPond = useMemo(() => {
    const map = new Map<string, any>();
    if (analysisData) {
      for (const a of analysisData) {
        map.set(a.pondId, a);
      }
    }
    return map;
  }, [analysisData]);

  // ── Mutations ──

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/projection/weekly", data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projection-detail"] });
      setSnack({ msg: t("crud.created"), severity: "success" });
      const newId = res.data.data.id;
      setTimeout(() => navigate(`/projection/${newId}`), 400);
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const realDataMut = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/projection/weekly/${id}/real-data`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projection-detail", id] });
      setSnack({ msg: t("crud.updated"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/projection/weekly/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projection-detail", id] });
      setSnack({ msg: t("crud.updated"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  // ── Derived data ──

  const pondSummaries = projection?.ponds ?? [];
  const dayIndices = [0, 1, 2, 3, 4, 5, 6, 7];

  const totalFeedByDay = useMemo(() => {
    return dayIndices.map((di) =>
      pondSummaries.reduce((sum, p) => {
        const day = p.days.find((d) => d.dayIndex === di);
        return sum + (day?.feedQuantityOverride ?? day?.feedQuantityLbs ?? 0);
      }, 0),
    );
  }, [pondSummaries]);

  const grandTotalFeedKg = useMemo(
    () =>
      Math.round(
        totalFeedByDay.reduce((s, v) => s + v, 0) * 0.4536 * 100,
      ) / 100,
    [totalFeedByDay],
  );

  // ── Handlers ──

  const handleCreate = () => {
    if (!farmId || !supplier || selectedPonds.length === 0) return;
    createMut.mutate({
      farmId,
      weekStartDate: weekDate,
      supplierName: supplier,
      pondIds: selectedPonds,
    });
  };

  const handleRealDataCommit = useCallback(
    (pondId: string, dayDate: string, field: string, value: number) => {
      const payload: any = { pondId, dayDate };
      if (field === "weight") payload.weight = value;
      if (field === "density") payload.density = value;
      if (field === "feedOverride") payload.feedQuantityOverride = value;
      realDataMut.mutate(payload);
    },
    [realDataMut],
  );

  const toggleSection = (key: SectionKey) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isRealDataDay = (di: number) => di === 0 || di === 4;

  // ── Section Header ──

  function SectionHeader({
    sectionKey,
    label,
  }: {
    sectionKey: SectionKey;
    label: string;
  }) {
    const expanded = expandedSections[sectionKey];
    return (
      <TableRow
        onClick={() => toggleSection(sectionKey)}
        sx={{
          cursor: "pointer",
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
        }}
      >
        <TableCell
          colSpan={4 + dayIndices.length + 2}
          sx={{ py: 0.75, fontWeight: 700, fontSize: "0.8rem" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {expanded ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
            {label}
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  // ── Cell styling ──

  const dayCellSx = (di: number) => ({
    textAlign: "right" as const,
    px: 1,
    py: 0.5,
    fontSize: "0.78rem",
    minWidth: 70,
    bgcolor: isRealDataDay(di) ? REAL_DATA_BG : undefined,
  });

  const stickyCell = {
    position: "sticky" as const,
    left: 0,
    zIndex: 2,
    bgcolor: "background.paper",
    fontWeight: 600,
    fontSize: "0.78rem",
    minWidth: 100,
    borderRight: `1px solid ${theme.palette.divider}`,
  };

  // ── Render: top bar (new mode) ──

  if (isNew) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          {t("projection.title")}
        </Typography>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box
            sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <TextField
              label={t("projection.weekStart")}
              type="date"
              size="small"
              value={weekDate}
              onChange={(e) => {
                const d = new Date(e.target.value);
                setWeekDate(toDateStr(snapToFriday(d)));
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
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
            <FormControl size="small" sx={{ minWidth: 300 }}>
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
            <Button
              variant="contained"
              startIcon={
                createMut.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              onClick={handleCreate}
              disabled={
                !supplier || selectedPonds.length === 0 || createMut.isPending
              }
            >
              {t("projection.generate")}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // ── Render: loading ──

  if (loadingProjection) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!projection) {
    return (
      <Typography sx={{ p: 3 }}>{t("projection.notFound")}</Typography>
    );
  }

  // ── Render: detail view ──

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t("projection.title")}
        </Typography>
        <Chip
          label={t(`projection.status.${projection.status}`)}
          color={STATUS_COLORS[projection.status] ?? "default"}
          size="small"
        />
        <Typography variant="body2" color="text.secondary">
          {new Date(projection.weekStartDate).toLocaleDateString("es-EC")} —{" "}
          {new Date(projection.weekEndDate).toLocaleDateString("es-EC")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("projection.supplier")}: <strong>{projection.supplierName}</strong>
        </Typography>
        <Box sx={{ flex: 1 }} />
        {projection.status === "draft" && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => statusMut.mutate("approved")}
            disabled={statusMut.isPending}
          >
            {t("projection.approve")}
          </Button>
        )}
        {projection.status === "approved" && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => statusMut.mutate("completed")}
            disabled={statusMut.isPending}
          >
            {t("projection.complete")}
          </Button>
        )}
      </Box>

      {/* Alert Panel */}
      <AlertPanel projectionId={id!} />

      {/* Main Grid */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: "calc(100vh - 200px)",
          overflow: "auto",
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: 1400 }}>
          {/* Column headers */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...stickyCell, zIndex: 3 }}>
                {t("projection.pond")}
              </TableCell>
              <TableCell sx={{ textAlign: "right", fontSize: "0.75rem", minWidth: 50 }}>
                HA
              </TableCell>
              <TableCell sx={{ textAlign: "right", fontSize: "0.75rem", minWidth: 60 }}>
                {t("projection.weeklyGrowth")}
              </TableCell>
              <TableCell sx={{ textAlign: "right", fontSize: "0.75rem", minWidth: 60 }}>
                {t("projection.dailyGrowth")}
              </TableCell>
              {dayIndices.map((di) => (
                <TableCell
                  key={di}
                  sx={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    bgcolor: isRealDataDay(di) ? REAL_DATA_BG : undefined,
                    minWidth: 75,
                  }}
                >
                  {DAY_LABELS[di]}
                  {isRealDataDay(di) && (
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ fontSize: "0.6rem", color: "text.secondary" }}
                    >
                      {t("projection.realData")}
                    </Typography>
                  )}
                </TableCell>
              ))}
              <TableCell sx={{ textAlign: "right", fontSize: "0.75rem", fontWeight: 700, minWidth: 80 }}>
                {t("projection.extras")}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* ── PESO section ── */}
            <SectionHeader sectionKey="peso" label={t("projection.sections.peso")} />
            {expandedSections.peso &&
              pondSummaries.map((pond) => (
                <TableRow key={`peso-${pond.pondId}`} hover>
                  <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                  <TableCell sx={{ textAlign: "right", fontSize: "0.78rem" }}>
                    {fmtNum(pond.hectares)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right", fontSize: "0.78rem" }}>
                    {fmtNum(pond.weeklyGrowthRate)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right", fontSize: "0.78rem" }}>
                    {fmtNum(pond.dailyGrowthRate)}
                  </TableCell>
                  {dayIndices.map((di) => {
                    const day = pond.days.find((d) => d.dayIndex === di);
                    if (!day) return <TableCell key={di} sx={dayCellSx(di)}>—</TableCell>;
                    return (
                      <TableCell key={di} sx={dayCellSx(di)}>
                        {isRealDataDay(di) ? (
                          <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                            <EditableCell
                              value={day.weight}
                              onCommit={(v) =>
                                handleRealDataCommit(
                                  pond.pondId,
                                  day.dayDate,
                                  "weight",
                                  v,
                                )
                              }
                            />
                            <DeviationIndicator day={day} />
                            <ComparisonPopover
                              day={day}
                              analysis={analysisByPond.get(pond.pondId)}
                            />
                          </Box>
                        ) : (
                          fmtNum(day.weight)
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ textAlign: "right", fontSize: "0.75rem" }}>
                    <Tooltip title={t("projection.expectedGrowth")}>
                      <span>{fmtNum(pond.expectedWeeklyGrowth)}</span>
                    </Tooltip>
                    {" / "}
                    <Tooltip title={t("projection.expectedFCA")}>
                      <span>{fmtNum(pond.expectedFCA)}</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

            {/* ── DENSIDAD section ── */}
            <SectionHeader
              sectionKey="densidad"
              label={t("projection.sections.densidad")}
            />
            {expandedSections.densidad &&
              pondSummaries.map((pond) => {
                const day0 = pond.days.find((d) => d.dayIndex === 0);
                return (
                  <TableRow key={`dens-${pond.pondId}`} hover>
                    <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                    <TableCell colSpan={3} />
                    {dayIndices.map((di) => {
                      const day = pond.days.find((d) => d.dayIndex === di);
                      if (di === 0) {
                        return (
                          <TableCell key={di} sx={dayCellSx(di)}>
                            <EditableCell
                              value={day?.density ?? 0}
                              onCommit={(v) =>
                                handleRealDataCommit(
                                  pond.pondId,
                                  day0?.dayDate ?? "",
                                  "density",
                                  v,
                                )
                              }
                            />
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={di} sx={dayCellSx(di)}>
                          {fmtNum(day?.density)}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>
                );
              })}

            {/* ── BIOMASA section ── */}
            <SectionHeader
              sectionKey="biomasa"
              label={t("projection.sections.biomasa")}
            />
            {expandedSections.biomasa &&
              pondSummaries.map((pond) => (
                <TableRow key={`bio-${pond.pondId}`} hover>
                  <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                  <TableCell colSpan={3} />
                  {dayIndices.map((di) => {
                    const day = pond.days.find((d) => d.dayIndex === di);
                    return (
                      <TableCell key={di} sx={dayCellSx(di)}>
                        {fmtInt(day?.biomassLbs)}
                      </TableCell>
                    );
                  })}
                  <TableCell />
                </TableRow>
              ))}

            {/* ── %BW section ── */}
            <SectionHeader
              sectionKey="bwPct"
              label={t("projection.sections.bwPercent")}
            />
            {expandedSections.bwPct &&
              pondSummaries.map((pond) => (
                <TableRow key={`bw-${pond.pondId}`} hover>
                  <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                  <TableCell colSpan={3} />
                  {dayIndices.map((di) => {
                    const day = pond.days.find((d) => d.dayIndex === di);
                    return (
                      <TableCell key={di} sx={dayCellSx(di)}>
                        {fmtPct(day?.bwPercent)}
                      </TableCell>
                    );
                  })}
                  <TableCell />
                </TableRow>
              ))}

            {/* ── FEED section ── */}
            <SectionHeader
              sectionKey="feed"
              label={t("projection.sections.feed")}
            />
            {expandedSections.feed && (
              <>
                {pondSummaries.map((pond) => (
                  <TableRow key={`feed-${pond.pondId}`} hover>
                    <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                    <TableCell colSpan={3} />
                    {dayIndices.map((di) => {
                      const day = pond.days.find((d) => d.dayIndex === di);
                      const val =
                        day?.feedQuantityOverride ?? day?.feedQuantityLbs ?? 0;
                      return (
                        <TableCell key={di} sx={dayCellSx(di)}>
                          {isRealDataDay(di) ? (
                            <EditableCell
                              value={val}
                              onCommit={(v) =>
                                handleRealDataCommit(
                                  pond.pondId,
                                  day?.dayDate ?? "",
                                  "feedOverride",
                                  v,
                                )
                              }
                            />
                          ) : (
                            fmtInt(val)
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ textAlign: "right", fontSize: "0.78rem", fontWeight: 600 }}>
                      {fmtNum(pond.totalFeedKg)} kg
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}
                >
                  <TableCell
                    sx={{
                      ...stickyCell,
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    TOTAL
                  </TableCell>
                  <TableCell colSpan={3} />
                  {dayIndices.map((di) => (
                    <TableCell
                      key={di}
                      sx={{
                        ...dayCellSx(di),
                        fontWeight: 700,
                      }}
                    >
                      {fmtInt(totalFeedByDay[di])}
                    </TableCell>
                  ))}
                  <TableCell
                    sx={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {fmtNum(grandTotalFeedKg)} kg
                  </TableCell>
                </TableRow>
              </>
            )}

            {/* ── KHD section ── */}
            <SectionHeader
              sectionKey="khd"
              label={t("projection.sections.khd")}
            />
            {expandedSections.khd &&
              pondSummaries.map((pond) => (
                <TableRow key={`khd-${pond.pondId}`} hover>
                  <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                  <TableCell colSpan={3} />
                  {dayIndices.map((di) => {
                    const day = pond.days.find((d) => d.dayIndex === di);
                    return (
                      <TableCell key={di} sx={dayCellSx(di)}>
                        {fmtInt(day?.khdFeed)}
                      </TableCell>
                    );
                  })}
                  <TableCell />
                </TableRow>
              ))}

            {/* ── RECAMBIO section ── */}
            <SectionHeader
              sectionKey="recambio"
              label={t("projection.sections.recambio")}
            />
            {expandedSections.recambio &&
              pondSummaries.map((pond) => (
                <TableRow key={`rec-${pond.pondId}`} hover>
                  <TableCell sx={stickyCell}>{pond.pondName}</TableCell>
                  <TableCell colSpan={3} />
                  {dayIndices.map((di) => (
                    <TableCell key={di} sx={dayCellSx(di)}>
                      —
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Snackbar */}
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
