import { useAuthStore } from "../../stores/authStore";
import { useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { FaChevronDown, FaTrash, FaSync } from "react-icons/fa";
import { FONTS } from "../../lib/globals";
import { goldButtonSx, headingSx, panelSx } from "../../lib/medievalStyles";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050/api";
const AGENT_URL = import.meta.env.VITE_AGENT_URL || "";

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface AdminUser {
  id: string;
  username: string;
  role: string;
  optedIn: boolean;
  createdAt: string;
}

interface KnowledgeChunk {
  id: string;
  sourceKey: string;
  content: string;
  updatedAt: string;
}

interface ServiceHealth {
  service: string;
  healthy: boolean;
  responseTimeMs?: number;
  error?: string;
}

export default function AdminPage() {
  const { role, isInitialized, username: currentUser } = useAuthStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isInitialized && role !== "Admin") {
      navigate("/", { replace: true });
    }
  }, [isInitialized, role, navigate]);

  if (!isInitialized) {
    return (
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress sx={{ color: "medievalGold.main" }} />
      </Container>
    );
  }

  if (role !== "Admin") return null;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ ...headingSx, mb: 4 }}>
        Admin Panel
      </Typography>

      <Stack spacing={3}>
        <HealthPanel />
        <IngestPanel />
        <KnowledgePanel />
        <UsersPanel currentUser={currentUser} />
      </Stack>
    </Container>
  );
}

// ── Health Dashboard ──────────────────────────────────────────────────────────

function HealthPanel() {
  const [health, setHealth] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const results: ServiceHealth[] = [];

    // .NET API
    try {
      const sw = performance.now();
      const resp = await fetch(`${API_BASE_URL.replace("/api", "")}/health`);
      results.push({
        service: ".NET API (Azure)",
        healthy: resp.ok,
        responseTimeMs: Math.round(performance.now() - sw),
      });
    } catch (e) {
      results.push({
        service: ".NET API (Azure)",
        healthy: false,
        error: String(e),
      });
    }

    // Agent service
    if (AGENT_URL) {
      try {
        const sw = performance.now();
        const resp = await fetch(`${AGENT_URL}/health`);
        results.push({
          service: "Agent (Render)",
          healthy: resp.ok,
          responseTimeMs: Math.round(performance.now() - sw),
        });
      } catch (e) {
        results.push({
          service: "Agent (Render)",
          healthy: false,
          error: String(e),
        });
      }
    }

    // DB (via admin endpoint)
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/health`, {
        headers: authHeader(),
      });
      if (resp.ok) {
        const data = (await resp.json()) as ServiceHealth[];
        results.push(...data);
      }
    } catch {
      results.push({
        service: "PostgreSQL",
        healthy: false,
        error: "Could not reach admin health endpoint",
      });
    }

    setHealth(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <AdminCard title="Service Health">
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {health.map((s) => (
          <Chip
            key={s.service}
            label={`${s.service} ${s.responseTimeMs ? `(${s.responseTimeMs}ms)` : ""}`}
            color={s.healthy ? "success" : "error"}
            variant="outlined"
            sx={{ fontFamily: FONTS.MEDIEVAL_SERIF, fontSize: "0.75rem" }}
          />
        ))}
        {health.length === 0 && !loading && (
          <Typography
            variant="body2"
            sx={{ color: "parchment.dark", fontFamily: FONTS.MEDIEVAL_SERIF }}
          >
            No health data yet.
          </Typography>
        )}
      </Stack>
      <Button
        size="small"
        onClick={checkHealth}
        disabled={loading}
        startIcon={
          loading ? <CircularProgress size={14} /> : <FaSync size={12} />
        }
        sx={{
          mt: 2,
          color: "medievalGold.light",
          fontFamily: FONTS.MEDIEVAL_DISPLAY,
          fontSize: "0.75rem",
        }}
      >
        Refresh
      </Button>
    </AdminCard>
  );
}

// ── Knowledge Ingest ──────────────────────────────────────────────────────────

function IngestPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    chunks?: number;
    error?: string;
  } | null>(null);

  async function handleIngest() {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/knowledge/ingest`, {
        method: "POST",
        headers: authHeader(),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult({ success: true, chunks: data.chunksUpserted });
      } else {
        setResult({ success: false, error: `Server error (${resp.status})` });
      }
    } catch {
      setResult({ success: false, error: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminCard
      title="Knowledge Ingest"
      subtitle="Re-reads about-me.json, regenerates embeddings, upserts all chunks."
    >
      <Button
        variant="contained"
        onClick={handleIngest}
        disabled={loading}
        sx={{ ...goldButtonSx, fontWeight: 700 }}
      >
        {loading ? (
          <>
            <CircularProgress size={18} sx={{ color: "#121212", mr: 1 }} />{" "}
            Ingesting...
          </>
        ) : (
          "Ingest Knowledge"
        )}
      </Button>
      {result && (
        <Alert
          severity={result.success ? "success" : "error"}
          sx={{ mt: 2, fontFamily: FONTS.MEDIEVAL_SERIF }}
        >
          {result.success
            ? `Done — ${result.chunks} chunks upserted.`
            : result.error}
        </Alert>
      )}
    </AdminCard>
  );
}

// ── Knowledge Viewer ──────────────────────────────────────────────────────────

function KnowledgePanel() {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChunks = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/knowledge/chunks`, {
        headers: authHeader(),
      });
      if (resp.ok) {
        const data = await resp.json();
        setChunks(data.chunks ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChunks();
  }, [loadChunks]);

  return (
    <AdminCard
      title="Knowledge Base"
      subtitle={`${chunks.length} chunks stored`}
    >
      {loading ? (
        <CircularProgress size={24} sx={{ color: "medievalGold.main" }} />
      ) : (
        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {chunks.map((chunk) => (
            <Accordion
              key={chunk.id}
              sx={{
                bgcolor: "rgba(200, 162, 74, 0.05)",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<FaChevronDown size={12} color="#a79c85" />}
              >
                <Typography
                  fontFamily={FONTS.MEDIEVAL_DISPLAY}
                  fontSize="0.85rem"
                  sx={{ color: "medievalGold.light" }}
                >
                  {chunk.sourceKey}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="body2"
                  sx={{
                    color: "parchment.dark",
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    whiteSpace: "pre-wrap",
                    fontSize: "0.78rem",
                  }}
                >
                  {chunk.content}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(230, 220, 196, 0.35)",
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    mt: 1,
                    display: "block",
                  }}
                >
                  Updated: {new Date(chunk.updatedAt).toLocaleDateString()}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </AdminCard>
  );
}

// ── Users Management ──────────────────────────────────────────────────────────

function UsersPanel({ currentUser }: { currentUser: string | null }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: authHeader(),
      });
      if (resp.ok) setUsers(await resp.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleRoleChange(username: string, newRole: string) {
    await fetch(`${API_BASE_URL}/admin/users/${username}/role`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    void loadUsers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`${API_BASE_URL}/admin/users/${deleteTarget}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    setDeleteTarget(null);
    void loadUsers();
  }

  return (
    <AdminCard title="Users" subtitle={`${users.length} registered`}>
      {loading ? (
        <CircularProgress size={24} sx={{ color: "medievalGold.main" }} />
      ) : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Username</TableCell>
                <TableCell sx={headerCellSx}>Role</TableCell>
                <TableCell sx={headerCellSx}>Opted In</TableCell>
                <TableCell sx={headerCellSx}>Joined</TableCell>
                <TableCell sx={headerCellSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell sx={cellSx}>{u.username}</TableCell>
                  <TableCell sx={cellSx}>
                    <Select
                      value={u.role}
                      size="small"
                      onChange={(e) =>
                        handleRoleChange(u.username, e.target.value)
                      }
                      disabled={u.username === currentUser}
                      sx={{
                        fontFamily: FONTS.MEDIEVAL_SERIF,
                        fontSize: "0.8rem",
                        color: "parchment.main",
                        ".MuiSelect-icon": { color: "parchment.dark" },
                      }}
                    >
                      <MenuItem value="User">User</MenuItem>
                      <MenuItem value="Admin">Admin</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell sx={cellSx}>{u.optedIn ? "Yes" : "No"}</TableCell>
                  <TableCell sx={cellSx}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {u.username !== currentUser && (
                      <Tooltip title="Delete user">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(u.username)}
                          sx={{
                            color: "rgba(255,255,255,0.3)",
                            "&:hover": { color: "#f44336" },
                          }}
                        >
                          <FaTrash size={12} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ ...headingSx }}>
          Delete user "{deleteTarget}"?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This cannot be undone. Their scores will remain but become unlinked.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </AdminCard>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function AdminCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper sx={{ ...panelSx, p: 3 }}>
      <Typography variant="h6" sx={{ ...headingSx, mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: "parchment.dark",
            fontFamily: FONTS.MEDIEVAL_SERIF,
            mb: 2,
          }}
        >
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

const headerCellSx = {
  fontFamily: FONTS.MEDIEVAL_DISPLAY,
  fontSize: "0.7rem",
  color: "medievalGold.light",
  bgcolor: "medievalStone.dark",
  borderColor: "rgba(200, 162, 74, 0.25)",
};
const cellSx = {
  fontFamily: FONTS.MEDIEVAL_SERIF,
  fontSize: "0.8rem",
  color: "parchment.main",
  borderColor: "rgba(200, 162, 74, 0.12)",
};
