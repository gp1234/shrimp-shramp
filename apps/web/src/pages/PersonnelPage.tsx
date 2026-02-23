import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
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
  Button,
  Avatar,
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
  Assignment,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  Edit,
} from "@mui/icons-material";
import api from "../api";
import { useFarm } from "../contexts/FarmContext";

interface Farm {
  id: string;
  name: string;
}
interface Pond {
  id: string;
  name: string;
  code: string;
}
interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  phone: string | null;
  isActive: boolean;
  farmId: string;
  farm: { name: string };
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  pondId: string | null;
  pond: { name: string; code: string } | null;
  assignments: { staff: { firstName: string; lastName: string } }[];
}

const EMPTY_STAFF = {
  firstName: "",
  lastName: "",
  position: "",
  phone: "",
  farmId: "",
  hireDate: new Date().toISOString().slice(0, 10),
};
const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  pondId: "",
};

export function PersonnelPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currentFarm } = useFarm();
  const farmId = currentFarm?.id;
  const [staffDialog, setStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [sf, setSf] = useState(EMPTY_STAFF);
  const [taskDialog, setTaskDialog] = useState(false);
  const [tf, setTf] = useState(EMPTY_TASK);
  const [snack, setSnack] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: staff, isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["personnel-staff", farmId],
    queryFn: () =>
      api
        .get("/personnel/staff", { params: { farmId } })
        .then((r) => r.data.data),
    enabled: !!farmId,
  });
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["personnel-tasks"],
    queryFn: () => api.get("/personnel/tasks").then((r) => r.data.data),
  });
  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["farms"],
    queryFn: () => api.get("/farms").then((r) => r.data.data),
  });
  const { data: ponds } = useQuery<Pond[]>({
    queryKey: ["ponds-list", farmId],
    queryFn: () =>
      api.get("/ponds", { params: { farmId } }).then((r) => r.data.data),
    enabled: !!farmId,
  });

  const ok = (key: string) => () => {
    qc.invalidateQueries({ queryKey: [key] });
    setStaffDialog(false);
    setTaskDialog(false);
    setEditingStaff(null);
    setSnack({ msg: t("crud.created"), severity: "success" });
  };
  const err = () => setSnack({ msg: t("crud.error"), severity: "error" });
  const createStaff = useMutation({
    mutationFn: (d: any) => api.post("/personnel/staff", d),
    onSuccess: ok("personnel-staff"),
    onError: err,
  });
  const updateStaff = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/personnel/staff/${id}`, d),
    onSuccess: ok("personnel-staff"),
    onError: err,
  });
  const createTask = useMutation({
    mutationFn: (d: any) => api.post("/personnel/tasks", d),
    onSuccess: ok("personnel-tasks"),
    onError: err,
  });

  const openCreateStaff = () => {
    setEditingStaff(null);
    setSf({ ...EMPTY_STAFF, farmId: farms?.[0]?.id || "" });
    setStaffDialog(true);
  };
  const openEditStaff = (s: Staff) => {
    setEditingStaff(s);
    setSf({
      firstName: s.firstName,
      lastName: s.lastName,
      position: s.position,
      phone: s.phone || "",
      farmId: s.farmId,
      hireDate: "",
    });
    setStaffDialog(true);
  };
  const submitStaff = () => {
    const p: any = {
      firstName: sf.firstName,
      lastName: sf.lastName,
      position: sf.position,
      farmId: sf.farmId,
    };
    if (sf.phone) p.phone = sf.phone;
    if (!editingStaff && sf.hireDate)
      p.hireDate = new Date(sf.hireDate).toISOString();
    editingStaff
      ? updateStaff.mutate({ id: editingStaff.id, d: p })
      : createStaff.mutate(p);
  };

  const openCreateTask = () => {
    setTf({ ...EMPTY_TASK, pondId: "" });
    setTaskDialog(true);
  };
  const submitTask = () => {
    const p: any = { title: tf.title, priority: tf.priority };
    if (tf.description) p.description = tf.description;
    if (tf.dueDate) p.dueDate = new Date(tf.dueDate).toISOString();
    if (tf.pondId) p.pondId = tf.pondId;
    createTask.mutate(p);
  };

  const pc: Record<string, string> = {
    HIGH: "#f44336",
    MEDIUM: "#ff9800",
    LOW: "#4caf50",
    URGENT: "#d32f2f",
  };
  const si: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle sx={{ fontSize: 16 }} />,
    IN_PROGRESS: <HourglassEmpty sx={{ fontSize: 16 }} />,
    PENDING: <ErrorIcon sx={{ fontSize: 16 }} />,
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t("personnel.title")}
          </Typography>
          <Typography variant="body2">{t("personnel.subtitle")}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ px: 3 }}
          onClick={openCreateStaff}
        >
          {t("personnel.addStaff")}
        </Button>
      </Box>

      <Typography variant="h5" sx={{ mb: 1.5 }}>
        {t("personnel.team")}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {staffLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton variant="rounded" height={140} />
                </Grid>
              ))
          : staff?.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: "100%", textAlign: "center" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mb: 0.5,
                      }}
                    >
                      <Tooltip title={t("crud.edit")}>
                        <IconButton
                          size="small"
                          onClick={() => openEditStaff(s)}
                        >
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Avatar
                      sx={{
                        width: 52,
                        height: 52,
                        mx: "auto",
                        mb: 1.5,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                      }}
                    >
                      {s.firstName[0]}
                      {s.lastName[0]}
                    </Avatar>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {s.firstName} {s.lastName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block", mb: 1 }}
                    >
                      {s.position} • {s.farm.name}
                    </Typography>
                    <Chip
                      label={
                        s.isActive ? t("status.active") : t("status.inactive")
                      }
                      size="small"
                      sx={{
                        bgcolor: alpha(
                          s.isActive ? "#4caf50" : "#94a3b8",
                          0.12,
                        ),
                        color: s.isActive ? "#4caf50" : "#94a3b8",
                        fontWeight: 600,
                        fontSize: "0.65rem",
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
        }}
      >
        <Typography variant="h5">{t("personnel.tasks")}</Typography>
        <Button size="small" startIcon={<Add />} onClick={openCreateTask}>
          {t("personnel.addTask")}
        </Button>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {tasksLoading
          ? Array(3)
              .fill(0)
              .map((_, i) => <Skeleton key={i} variant="rounded" height={70} />)
          : tasks?.map((task) => (
              <Card key={task.id}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: alpha(
                            pc[task.priority] || "#94a3b8",
                            0.12,
                          ),
                          color: pc[task.priority] || "#94a3b8",
                        }}
                      >
                        <Assignment sx={{ fontSize: 16 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {task.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {task.pond ? `${task.pond.code} — ` : ""}
                          {task.assignments
                            .map(
                              (a) => `${a.staff.firstName} ${a.staff.lastName}`,
                            )
                            .join(", ") || t("personnel.unassigned")}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {task.dueDate && (
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Typography>
                      )}
                      <Chip
                        icon={si[task.status] as any}
                        label={t(`taskStatus.${task.status}`, task.status)}
                        size="small"
                        sx={{
                          bgcolor: alpha(
                            task.status === "COMPLETED"
                              ? "#4caf50"
                              : task.status === "IN_PROGRESS"
                                ? "#ff9800"
                                : "#94a3b8",
                            0.12,
                          ),
                          color:
                            task.status === "COMPLETED"
                              ? "#4caf50"
                              : task.status === "IN_PROGRESS"
                                ? "#ff9800"
                                : "#94a3b8",
                          fontWeight: 600,
                          fontSize: "0.65rem",
                        }}
                      />
                      <Chip
                        label={task.priority}
                        size="small"
                        sx={{
                          bgcolor: alpha(pc[task.priority] || "#94a3b8", 0.12),
                          color: pc[task.priority] || "#94a3b8",
                          fontWeight: 600,
                          fontSize: "0.65rem",
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
      </Box>

      {/* Staff Dialog */}
      <Dialog
        open={staffDialog}
        onClose={() => setStaffDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingStaff ? t("crud.edit") : t("personnel.addStaff")}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("crud.firstName")}
              value={sf.firstName}
              onChange={(e) => setSf({ ...sf, firstName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t("crud.lastName")}
              value={sf.lastName}
              onChange={(e) => setSf({ ...sf, lastName: e.target.value })}
              fullWidth
              required
            />
          </Box>
          <TextField
            label={t("crud.position")}
            value={sf.position}
            onChange={(e) => setSf({ ...sf, position: e.target.value })}
            fullWidth
            required
          />
          <TextField
            select
            label={t("crud.farm")}
            value={sf.farmId}
            onChange={(e) => setSf({ ...sf, farmId: e.target.value })}
            fullWidth
            required
          >
            {farms?.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("crud.phone")}
              value={sf.phone}
              onChange={(e) => setSf({ ...sf, phone: e.target.value })}
              fullWidth
            />
            {!editingStaff && (
              <TextField
                label={t("crud.hireDate")}
                type="date"
                value={sf.hireDate}
                onChange={(e) => setSf({ ...sf, hireDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStaffDialog(false)}>
            {t("crud.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={submitStaff}
            disabled={
              !sf.firstName || !sf.lastName || !sf.position || !sf.farmId
            }
          >
            {editingStaff ? t("crud.save") : t("crud.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog */}
      <Dialog
        open={taskDialog}
        onClose={() => setTaskDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("personnel.addTask")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          <TextField
            label={t("crud.taskTitle")}
            value={tf.title}
            onChange={(e) => setTf({ ...tf, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t("crud.description")}
            value={tf.description}
            onChange={(e) => setTf({ ...tf, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label={t("crud.priority")}
              value={tf.priority}
              onChange={(e) => setTf({ ...tf, priority: e.target.value })}
              fullWidth
            >
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("crud.dueDate")}
              type="date"
              value={tf.dueDate}
              onChange={(e) => setTf({ ...tf, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            select
            label={t("feeding.pond")}
            value={tf.pondId}
            onChange={(e) => setTf({ ...tf, pondId: e.target.value })}
            fullWidth
          >
            <MenuItem value="">—</MenuItem>
            {ponds?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.code} — {p.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTaskDialog(false)}>
            {t("crud.cancel")}
          </Button>
          <Button variant="contained" onClick={submitTask} disabled={!tf.title}>
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
