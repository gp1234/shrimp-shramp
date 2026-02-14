import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Box,
  Grid2 as Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  alpha,
  useTheme,
  Skeleton,
} from "@mui/material";
import {
  Pool as PondIcon,
  Loop as CycleIcon,
  TrendingUp,
  AttachMoney,
  ScaleOutlined,
  WaterDrop,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../api";

interface DashboardKPI {
  totalPonds: number;
  activePonds: number;
  activeCycles: number;
  completedCycles: number;
  totalBiomass: number;
  averageSurvivalRate: number;
  averageFCR: number;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
}

interface PondOverview {
  id: string;
  code: string;
  name: string;
  area: number;
  status: string;
  activeCycleName: string | null;
  daysInCycle: number;
  survivalRate: number;
  lastTemperature: number | null;
  lastPh: number | null;
  lastDO: number | null;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}) {
  const theme = useTheme();
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
              color,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Chip
              label={trend}
              size="small"
              sx={{
                background: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                fontWeight: 600,
                fontSize: "0.7rem",
                height: 24,
              }}
            />
          )}
        </Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 0.5, fontSize: "1.75rem" }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", fontWeight: 500 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", mt: 0.5, display: "block" }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    ACTIVE: "#4caf50",
    INACTIVE: "#94a3b8",
    MAINTENANCE: "#ff9800",
    GROWING: "#2bb5d2",
    STOCKING: "#00a7ca",
    COMPLETED: "#4caf50",
  };
  return (
    <Chip
      label={t(`status.${status}`, status)}
      size="small"
      sx={{
        background: alpha(colors[status] || "#94a3b8", 0.15),
        color: colors[status] || "#94a3b8",
        fontWeight: 600,
        fontSize: "0.65rem",
        height: 22,
        letterSpacing: "0.03em",
      }}
    />
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const { t } = useTranslation();

  const { data: kpi, isLoading: kpiLoading } = useQuery<DashboardKPI>({
    queryKey: ["kpi-dashboard"],
    queryFn: () => api.get("/kpi/dashboard").then((r) => r.data.data),
  });

  const { data: pondsOverview, isLoading: pondsLoading } = useQuery<
    PondOverview[]
  >({
    queryKey: ["ponds-overview"],
    queryFn: () => api.get("/kpi/ponds-overview").then((r) => r.data.data),
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val);

  const areaData = [
    { day: "Lun", biomass: 35000, revenue: 45000 },
    { day: "Mar", biomass: 36200, revenue: 47000 },
    { day: "Mié", biomass: 37800, revenue: 49000 },
    { day: "Jue", biomass: 38500, revenue: 51000 },
    { day: "Vie", biomass: 40200, revenue: 55000 },
    { day: "Sáb", biomass: 41000, revenue: 58000 },
    { day: "Dom", biomass: 41962, revenue: 61119 },
  ];

  const pondStatusData = pondsOverview
    ? [
        {
          name: t("chart.active"),
          value: pondsOverview.filter((p) => p.status === "ACTIVE").length,
          color: "#4caf50",
        },
        {
          name: t("chart.inactive"),
          value: pondsOverview.filter((p) => p.status === "INACTIVE").length,
          color: "#94a3b8",
        },
        {
          name: t("chart.maintenance"),
          value: pondsOverview.filter((p) => p.status === "MAINTENANCE").length,
          color: "#ff9800",
        },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("dashboard.title")}
        </Typography>
        <Typography variant="body2">{t("app.welcome")}</Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {kpiLoading ? (
            <Skeleton variant="rounded" height={150} />
          ) : (
            <KPICard
              title={t("dashboard.totalPonds")}
              value={`${kpi?.activePonds || 0} / ${kpi?.totalPonds || 0}`}
              subtitle={t("dashboard.activePonds")}
              icon={<PondIcon />}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {kpiLoading ? (
            <Skeleton variant="rounded" height={150} />
          ) : (
            <KPICard
              title={t("dashboard.activeCycles")}
              value={String(kpi?.activeCycles || 0)}
              subtitle={t("dashboard.completed", {
                count: kpi?.completedCycles || 0,
              })}
              icon={<CycleIcon />}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {kpiLoading ? (
            <Skeleton variant="rounded" height={150} />
          ) : (
            <KPICard
              title={t("dashboard.totalBiomass")}
              value={`${((kpi?.totalBiomass || 0) / 1000).toFixed(1)}t`}
              subtitle={t("dashboard.survival", {
                rate: kpi?.averageSurvivalRate || 0,
              })}
              icon={<ScaleOutlined />}
              color={theme.palette.success.main}
              trend="+5.2%"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {kpiLoading ? (
            <Skeleton variant="rounded" height={150} />
          ) : (
            <KPICard
              title={t("dashboard.profit")}
              value={formatCurrency(kpi?.profit || 0)}
              subtitle={t("dashboard.revenue", {
                amount: formatCurrency(kpi?.totalRevenue || 0),
              })}
              icon={<AttachMoney />}
              color={theme.palette.secondary.main}
              trend="+12.8%"
            />
          )}
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                {t("dashboard.productionTrend")}
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient
                      id="colorBiomass"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={theme.palette.secondary.main}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.secondary.main}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={alpha("#94a3b8", 0.08)}
                  />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${alpha("#94a3b8", 0.1)}`,
                      borderRadius: 8,
                      color: "#e3e8ef",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="biomass"
                    stroke={theme.palette.primary.main}
                    fillOpacity={1}
                    fill="url(#colorBiomass)"
                    strokeWidth={2}
                    name={t("dashboard.biomassLabel")}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={theme.palette.secondary.main}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                    name={t("dashboard.revenueLabel")}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                {t("dashboard.pondStatus")}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pondStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {pondStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${alpha("#94a3b8", 0.1)}`,
                        borderRadius: 8,
                        color: "#e3e8ef",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                  mt: 1,
                }}
              >
                {pondStatusData.map((d) => (
                  <Box
                    key={d.name}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: d.color,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {d.name} ({d.value})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ponds Overview Table */}
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {t("dashboard.pondsOverview")}
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                "& th": {
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  p: 1.5,
                  textAlign: "left",
                  borderBottom: `1px solid ${alpha("#94a3b8", 0.08)}`,
                },
                "& td": {
                  p: 1.5,
                  fontSize: "0.85rem",
                  borderBottom: `1px solid ${alpha("#94a3b8", 0.04)}`,
                },
                "& tr:hover td": { bgcolor: alpha("#94a3b8", 0.04) },
              }}
            >
              <thead>
                <tr>
                  <th>{t("table.pond")}</th>
                  <th>{t("table.status")}</th>
                  <th>{t("table.activeCycle")}</th>
                  <th>{t("table.days")}</th>
                  <th>{t("table.survival")}</th>
                  <th>{t("table.tempC")}</th>
                  <th>{t("table.ph")}</th>
                  <th>{t("table.doMgL")}</th>
                </tr>
              </thead>
              <tbody>
                {pondsLoading
                  ? Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          {Array(8)
                            .fill(0)
                            .map((_, j) => (
                              <td key={j}>
                                <Skeleton width={60} />
                              </td>
                            ))}
                        </tr>
                      ))
                  : pondsOverview?.map((pond) => (
                      <tr key={pond.id}>
                        <td>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <WaterDrop
                              sx={{ fontSize: 16, color: "primary.main" }}
                            />
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: "text.primary" }}
                              >
                                {pond.code}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {pond.name} • {pond.area} ha
                              </Typography>
                            </Box>
                          </Box>
                        </td>
                        <td>
                          <StatusBadge status={pond.status} />
                        </td>
                        <td>{pond.activeCycleName || t("common.noData")}</td>
                        <td>{pond.daysInCycle || t("common.noData")}</td>
                        <td>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color:
                                pond.survivalRate > 80
                                  ? "success.main"
                                  : pond.survivalRate > 60
                                    ? "warning.main"
                                    : "error.main",
                            }}
                          >
                            {pond.survivalRate > 0
                              ? `${pond.survivalRate}%`
                              : t("common.noData")}
                          </Typography>
                        </td>
                        <td>
                          {pond.lastTemperature?.toFixed(1) ??
                            t("common.noData")}
                        </td>
                        <td>{pond.lastPh?.toFixed(1) ?? t("common.noData")}</td>
                        <td>{pond.lastDO?.toFixed(1) ?? t("common.noData")}</td>
                      </tr>
                    ))}
              </tbody>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
