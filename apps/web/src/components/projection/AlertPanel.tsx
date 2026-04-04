import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import api from "../../api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Skeleton,
  alpha,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";

interface AnalysisRow {
  id: string;
  pondId: string;
  pond: { name: string; code: string };
  alertLevel: string | null;
  alertReasons: string[] | null;
  projectedWeight: number;
  actualWeight: number | null;
  weightDeviationPercent: number | null;
  fcaAtarraya: number | null;
  fcaConsumption: number | null;
  survivalAtarraya: number | null;
  biomassDiscrepancyPercent: number | null;
  populationSampling: {
    averageWeight: number;
    shrimpPerSqMeter: number;
    diseasePercent: number;
  } | null;
}

const ALERT_REASON_LABELS: Record<string, string> = {
  weight_above_projected: "alerts.weightAbove",
  weight_below_projected: "alerts.weightBelow",
  fca_warning: "alerts.fcaWarning",
  fca_critical: "alerts.fcaCritical",
  survival_drop: "alerts.survivalDrop",
  disease_percent_high: "alerts.diseaseHigh",
  biomass_discrepancy_high: "alerts.biomassDiscrepancy",
};

export function AlertPanel({ projectionId }: { projectionId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { data: analyses, isLoading } = useQuery<AnalysisRow[]>({
    queryKey: ["projection-analysis", projectionId],
    queryFn: () =>
      api
        .get(`/projection/weekly/${projectionId}/analysis`)
        .then((r) => r.data.data),
    enabled: !!projectionId,
  });

  if (isLoading) {
    return <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />;
  }

  if (!analyses || analyses.length === 0) return null;

  const alertPonds = analyses.filter(
    (a) => a.alertLevel === "warning" || a.alertLevel === "critical",
  );

  // All normal — show green bar
  if (alertPonds.length === 0) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.success.main, 0.08),
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CheckIcon sx={{ color: "success.main", fontSize: 20 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
          {t("alerts.allNormal")}
        </Typography>
      </Box>
    );
  }

  // Show scrollable alert cards
  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        gap: 1.5,
        overflowX: "auto",
        pb: 0.5,
        "&::-webkit-scrollbar": { height: 4 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: alpha(theme.palette.text.primary, 0.15),
          borderRadius: 2,
        },
      }}
    >
      {alertPonds.map((a) => {
        const isCritical = a.alertLevel === "critical";
        const alertColor = isCritical ? "error" : "warning";
        const AlertIcon = isCritical ? ErrorIcon : WarningIcon;

        return (
          <Card
            key={a.id}
            sx={{
              minWidth: 240,
              maxWidth: 300,
              flexShrink: 0,
              border: `1px solid ${alpha(
                theme.palette[alertColor].main,
                0.3,
              )}`,
              bgcolor: alpha(theme.palette[alertColor].main, 0.04),
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <AlertIcon
                  sx={{ fontSize: 18, color: `${alertColor}.main` }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {a.pond.name}
                </Typography>
                <Chip
                  label={isCritical ? t("alerts.critical") : t("alerts.warning")}
                  color={alertColor}
                  size="small"
                  sx={{ ml: "auto", height: 20, fontSize: "0.65rem" }}
                />
              </Box>

              {/* Metric details based on alertReasons */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                {(a.alertReasons ?? []).map((reason) => (
                  <Typography
                    key={reason}
                    variant="caption"
                    sx={{ color: "text.secondary", fontSize: "0.7rem" }}
                  >
                    {formatAlertDetail(reason, a, t)}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

function formatAlertDetail(
  reason: string,
  a: AnalysisRow,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (reason) {
    case "weight_above_projected":
    case "weight_below_projected": {
      const sign = (a.weightDeviationPercent ?? 0) > 0 ? "+" : "";
      return t("alerts.weightDetail", {
        deviation: `${sign}${(a.weightDeviationPercent ?? 0).toFixed(1)}%`,
      });
    }
    case "fca_warning":
    case "fca_critical":
      return t("alerts.fcaDetail", {
        fca: (a.fcaConsumption ?? 0).toFixed(2),
      });
    case "survival_drop":
      return t("alerts.survivalDetail", {
        survival: (a.survivalAtarraya ?? 0).toFixed(1) + "%",
      });
    case "disease_percent_high":
      return t("alerts.diseaseDetail", {
        pct: (a.populationSampling?.diseasePercent ?? 0).toFixed(1) + "%",
      });
    case "biomass_discrepancy_high":
      return t("alerts.biomassDetail", {
        pct: (a.biomassDiscrepancyPercent ?? 0).toFixed(1) + "%",
      });
    default:
      return reason;
  }
}
