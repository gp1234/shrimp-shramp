import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  alpha,
  useTheme,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import type { PondDayProjection } from "@shrampi/types";

interface AnalysisData {
  projectedWeight: number;
  actualWeight: number | null;
  weightDeviationPercent: number | null;
  projectedBiomassKg: number | null;
  atarrayaBiomassKg: number | null;
  consumptionBiomassKg: number | null;
  biomassDiscrepancyPercent: number | null;
  fcaAtarraya: number | null;
  fcaConsumption: number | null;
  survivalAtarraya: number | null;
  survivalConsumption: number | null;
  alertLevel: string | null;
  alertReasons: string[] | null;
}

const CAUSE_MAP: Record<string, string> = {
  weight_above_projected: "comparison.causeWeightAbove",
  weight_below_projected: "comparison.causeWeightBelow",
  fca_warning: "comparison.causeFcaHigh",
  fca_critical: "comparison.causeFcaCritical",
  survival_drop: "comparison.causeSurvivalDrop",
  disease_percent_high: "comparison.causeDiseaseHigh",
  biomass_discrepancy_high: "comparison.causeBiomassGap",
};

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toLocaleString("es-EC", { maximumFractionDigits: decimals });
}

export function ComparisonPopover({
  day,
  analysis,
}: {
  day: PondDayProjection;
  analysis?: AnalysisData;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Only show if this is a real-data day with linked analysis
  if (!day.isRealData || !analysis) return null;

  const open = Boolean(anchorEl);

  const rows: { label: string; projected: string; real: string; atarraya: string; consumo: string }[] = [
    {
      label: t("comparison.weight"),
      projected: fmt(analysis.projectedWeight) + "g",
      real: fmt(analysis.actualWeight) + "g",
      atarraya: "—",
      consumo: "—",
    },
    {
      label: t("comparison.biomassKg"),
      projected: fmt(analysis.projectedBiomassKg),
      real: "—",
      atarraya: fmt(analysis.atarrayaBiomassKg),
      consumo: fmt(analysis.consumptionBiomassKg),
    },
    {
      label: "FCA",
      projected: "—",
      real: "—",
      atarraya: fmt(analysis.fcaAtarraya),
      consumo: fmt(analysis.fcaConsumption),
    },
    {
      label: t("comparison.survival"),
      projected: "—",
      real: "—",
      atarraya: fmt(analysis.survivalAtarraya, 1) + "%",
      consumo: fmt(analysis.survivalConsumption, 1) + "%",
    },
  ];

  const reasons = (analysis.alertReasons ?? []).filter(
    (r) => CAUSE_MAP[r] != null,
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ p: 0.25, ml: 0.25 }}
      >
        <InfoIcon sx={{ fontSize: 14, color: "info.main" }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 380, maxWidth: 460 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t("comparison.title")} — {day.pondName}
          </Typography>

          <Table size="small">
            <TableBody>
              {/* Header row */}
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", border: 0, py: 0.5 }} />
                <TableCell
                  sx={{ fontWeight: 600, fontSize: "0.7rem", textAlign: "right", border: 0, py: 0.5 }}
                >
                  {t("comparison.projected")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, fontSize: "0.7rem", textAlign: "right", border: 0, py: 0.5 }}
                >
                  {t("comparison.real")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, fontSize: "0.7rem", textAlign: "right", border: 0, py: 0.5 }}
                >
                  {t("comparison.atarraya")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, fontSize: "0.7rem", textAlign: "right", border: 0, py: 0.5 }}
                >
                  {t("comparison.consumo")}
                </TableCell>
              </TableRow>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell
                    sx={{ fontSize: "0.75rem", fontWeight: 600, py: 0.5 }}
                  >
                    {r.label}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", textAlign: "right", py: 0.5 }}>
                    {r.projected}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", textAlign: "right", py: 0.5 }}>
                    {r.real}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", textAlign: "right", py: 0.5 }}>
                    {r.atarraya}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", textAlign: "right", py: 0.5 }}>
                    {r.consumo}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Weight deviation highlight */}
          {analysis.weightDeviationPercent != null && (
            <Box
              sx={{
                mt: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: alpha(
                  Math.abs(analysis.weightDeviationPercent) > 10
                    ? theme.palette.error.main
                    : theme.palette.success.main,
                  0.08,
                ),
                fontSize: "0.75rem",
              }}
            >
              {t("comparison.deviation")}: {analysis.weightDeviationPercent > 0 ? "+" : ""}
              {analysis.weightDeviationPercent.toFixed(1)}%
            </Box>
          )}

          {/* Possible causes */}
          {reasons.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.7rem" }}
              >
                {t("comparison.possibleCauses")}:
              </Typography>
              {reasons.map((r) => (
                <Typography
                  key={r}
                  variant="caption"
                  display="block"
                  sx={{ fontSize: "0.7rem", color: "text.secondary", pl: 1 }}
                >
                  - {t(CAUSE_MAP[r]!)}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
