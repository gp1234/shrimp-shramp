import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Box,
  Grid2 as Grid,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Delete,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import api from "../api";
import { useFarm } from "../contexts/FarmContext";

interface Farm {
  id: string;
  name: string;
}
interface ExpenseCat {
  id: string;
  name: string;
}
interface Cycle {
  id: string;
  name: string;
}
interface OpCost {
  id: string;
  description: string;
  amount: number;
  date: string;
  farmId: string;
  categoryId: string;
  category: { name: string };
}
interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: string | null;
  cycleId: string;
}

const EMPTY_COST = {
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  farmId: "",
  categoryId: "",
  notes: "",
};
const EMPTY_REV = {
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  cycleId: "",
  source: "",
};

export function FinancialPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;
  const [costDialog, setCostDialog] = useState(false);
  const [revDialog, setRevDialog] = useState(false);
  const [cf, setCf] = useState(EMPTY_COST);
  const [rf, setRf] = useState(EMPTY_REV);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: costs, isLoading: costsLoading } = useQuery<OpCost[]>({
    queryKey: ["fin-costs", farmId],
    queryFn: () =>
      api
        .get("/financial/costs", { params: { farmId } })
        .then((r) => r.data.data),
    enabled: !!farmId,
  });
  const { data: revenue, isLoading: revLoading } = useQuery<Revenue[]>({
    queryKey: ["fin-revenue"],
    queryFn: () => api.get("/financial/revenue").then((r) => r.data.data),
  });
  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["farms"],
    queryFn: () => api.get("/farms").then((r) => r.data.data),
  });
  const { data: categories } = useQuery<ExpenseCat[]>({
    queryKey: ["expense-cats"],
    queryFn: () => api.get("/financial/categories").then((r) => r.data.data),
  });
  const { data: cycles } = useQuery<Cycle[]>({
    queryKey: ["cycles-list", farmId],
    queryFn: () =>
      api.get("/cycles", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const createCost = useMutation({
    mutationFn: (d: any) => api.post("/financial/costs", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-costs"] });
      setCostDialog(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });
  const createRev = useMutation({
    mutationFn: (d: any) => api.post("/financial/revenue", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-revenue"] });
      setRevDialog(false);
      setSnack({ msg: t("crud.created"), severity: "success" });
    },
    onError: () => setSnack({ msg: t("crud.error"), severity: "error" }),
  });

  const openCost = () => {
    setCf({
      ...EMPTY_COST,
      farmId: farms?.[0]?.id || "",
      categoryId: categories?.[0]?.id || "",
    });
    setCostDialog(true);
  };
  const openRev = () => {
    setRf({ ...EMPTY_REV, cycleId: cycles?.[0]?.id || "" });
    setRevDialog(true);
  };

  const submitCost = () => {
    createCost.mutate({
      description: cf.description,
      amount: parseFloat(cf.amount),
      date: new Date(cf.date).toISOString(),
      farmId: cf.farmId,
      categoryId: cf.categoryId,
      notes: cf.notes || null,
    });
  };
  const submitRev = () => {
    createRev.mutate({
      description: rf.description,
      amount: parseFloat(rf.amount),
      date: new Date(rf.date).toISOString(),
      cycleId: rf.cycleId,
      source: rf.source || null,
    });
  };

  const totalCosts = costs?.reduce((s, c) => s + c.amount, 0) || 0;
  const totalRevenue = revenue?.reduce((s, r) => s + r.amount, 0) || 0;
  const profit = totalRevenue - totalCosts;

  // Cost breakdown
  const costByCat: Record<string, number> = {};
  costs?.forEach((c) => {
    costByCat[c.category.name] = (costByCat[c.category.name] || 0) + c.amount;
  });
  const chartData = Object.entries(costByCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  const summaryCards = [
    {
      label: t("financial.totalRevenue"),
      value: fmt(totalRevenue),
      icon: <TrendingUp />,
      color: "#4caf50",
    },
    {
      label: t("financial.totalCosts"),
      value: fmt(totalCosts),
      icon: <TrendingDown />,
      color: "#f44336",
    },
    {
      label: t("financial.profit"),
      value: fmt(profit),
      icon: <AccountBalance />,
      color: profit >= 0 ? "#4caf50" : "#f44336",
    },
  ];

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
            {t("financial.title")}
          </Typography>
          <Typography variant="body2">{t("financial.subtitle")}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={openCost}>
            {t("crud.addCost")}
          </Button>
          <Button variant="outlined" startIcon={<Add />} onClick={openRev}>
            {t("crud.addRevenue")}
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((c, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent
                sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: alpha(c.color, 0.12),
                    color: c.color,
                  }}
                >
                  {c.icon}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    {c.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {c.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {t("financial.costByCategory")}
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={alpha(theme.palette.text.primary, 0.08)}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  width={80}
                />
                <RTooltip
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: "none",
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="value"
                  name={t("financial.amount")}
                  fill={theme.palette.primary.main}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent lists */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("financial.recentCosts")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {costsLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={50} />
                  ))
              : costs?.slice(0, 8).map((c) => (
                  <Card key={c.id}>
                    <CardContent
                      sx={{
                        p: 1.5,
                        "&:last-child": { pb: 1.5 },
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {c.category.name} •{" "}
                          {new Date(c.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "#f44336" }}
                      >
                        -{fmt(c.amount)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("financial.recentRevenue")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {revLoading
              ? Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={50} />
                  ))
              : revenue?.slice(0, 8).map((r) => (
                  <Card key={r.id}>
                    <CardContent
                      sx={{
                        p: 1.5,
                        "&:last-child": { pb: 1.5 },
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {r.source || "—"} •{" "}
                          {new Date(r.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "#4caf50" }}
                      >
                        +{fmt(r.amount)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
          </Box>
        </Grid>
      </Grid>

      {/* Cost Dialog */}
      <Dialog
        open={costDialog}
        onClose={() => setCostDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("crud.addCost")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            label={t("crud.description")}
            value={cf.description}
            onChange={(e) => setCf({ ...cf, description: e.target.value })}
            fullWidth
            required
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={`${t("financial.amount")} ($)`}
              type="number"
              value={cf.amount}
              onChange={(e) => setCf({ ...cf, amount: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t("feeding.date")}
              type="date"
              value={cf.date}
              onChange={(e) => setCf({ ...cf, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label={t("crud.farm")}
              value={cf.farmId}
              onChange={(e) => setCf({ ...cf, farmId: e.target.value })}
              fullWidth
              required
            >
              {farms?.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("crud.category")}
              value={cf.categoryId}
              onChange={(e) => setCf({ ...cf, categoryId: e.target.value })}
              fullWidth
              required
            >
              {categories?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label={t("crud.notes")}
            value={cf.notes}
            onChange={(e) => setCf({ ...cf, notes: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCostDialog(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={submitCost}
            disabled={
              !cf.description || !cf.amount || !cf.farmId || !cf.categoryId
            }
          >
            {t("crud.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revenue Dialog */}
      <Dialog
        open={revDialog}
        onClose={() => setRevDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("crud.addRevenue")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            label={t("crud.description")}
            value={rf.description}
            onChange={(e) => setRf({ ...rf, description: e.target.value })}
            fullWidth
            required
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={`${t("financial.amount")} ($)`}
              type="number"
              value={rf.amount}
              onChange={(e) => setRf({ ...rf, amount: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t("feeding.date")}
              type="date"
              value={rf.date}
              onChange={(e) => setRf({ ...rf, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label={t("crud.cycle")}
              value={rf.cycleId}
              onChange={(e) => setRf({ ...rf, cycleId: e.target.value })}
              fullWidth
              required
            >
              {cycles?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("crud.source")}
              value={rf.source}
              onChange={(e) => setRf({ ...rf, source: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevDialog(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={submitRev}
            disabled={!rf.description || !rf.amount || !rf.cycleId}
          >
            {t("crud.create")}
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
