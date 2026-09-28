import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuthStore } from "../../stores/authStore";
import { FONTS } from "../../lib/globals";
import {
  dialogPaperSx,
  goldButtonSx,
  headingSx,
} from "../../lib/medievalStyles";

export type AuthTab = "login" | "register";

interface UserAuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: AuthTab;
}

const UserAuthModal = ({
  open,
  onClose,
  defaultTab = "register",
}: UserAuthModalProps) => {
  const { register, loginUser } = useAuthStore();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
    onClose();
  };

  const handleTabChange = (_: React.SyntheticEvent, newTab: AuthTab) => {
    setTab(newTab);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    if (tab === "register") {
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    setError("");
    setLoading(true);

    const result =
      tab === "register"
        ? await register(username.trim(), password)
        : await loginUser(username.trim(), password);

    setLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setError(
        result.error ??
          (tab === "register" ? "Registration failed." : "Login failed."),
      );
      setPassword("");
      setConfirmPassword("");
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      color: "parchment.main",
      fontFamily: FONTS.MEDIEVAL_SERIF,
      fontSize: "0.95rem",
      "& fieldset": { borderColor: "rgba(200, 162, 74, 0.32)" },
      "&:hover fieldset": { borderColor: "rgba(200, 162, 74, 0.6)" },
      "&.Mui-focused fieldset": { borderColor: "#c8a24a" },
    },
    "& .MuiInputLabel-root": {
      color: "rgba(230, 220, 196, 0.55)",
      fontFamily: FONTS.MEDIEVAL_SERIF,
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#e8cf8f" },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          ...dialogPaperSx,
          boxShadow:
            "0 0 40px rgba(200, 162, 74, 0.10), 0 16px 60px rgba(0,0,0,0.9)",
        },
      }}
    >
      <DialogContent sx={{ p: 0, pb: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            pt: 2.5,
            pb: 1,
            borderBottom: "1px solid rgba(200, 162, 74, 0.2)",
          }}
        >
          <Typography variant="h6" sx={{ ...headingSx }}>
            Track Your Scores
          </Typography>
          <IconButton
            onClick={handleClose}
            sx={{ color: "rgba(230, 220, 196, 0.45)" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            px: 2,
            borderBottom: "1px solid rgba(200, 162, 74, 0.12)",
            "& .MuiTab-root": {
              fontFamily: FONTS.MEDIEVAL_DISPLAY,
              fontSize: "0.85rem",
              letterSpacing: "0.06em",
              color: "rgba(230, 220, 196, 0.45)",
              minWidth: 0,
              px: 2,
            },
            "& .Mui-selected": { color: "#e8cf8f !important" },
            "& .MuiTabs-indicator": { backgroundColor: "medievalGold.main" },
          }}
        >
          <Tab label="Register" value="register" />
          <Tab label="Sign In" value="login" />
        </Tabs>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, pt: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              fullWidth
              inputProps={{ maxLength: 50 }}
              sx={fieldSx}
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                tab === "register" ? "new-password" : "current-password"
              }
              disabled={loading}
              fullWidth
              sx={fieldSx}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      sx={{ color: "rgba(255,255,255,0.35)" }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {tab === "register" && (
              <TextField
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                fullWidth
                sx={fieldSx}
              />
            )}

            {error && (
              <Typography
                variant="caption"
                sx={{ color: "#e08080", fontFamily: FONTS.MEDIEVAL_SERIF }}
              >
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={
                loading ||
                !username.trim() ||
                !password ||
                (tab === "register" && !confirmPassword)
              }
              fullWidth
              sx={{
                ...goldButtonSx,
                fontSize: "0.95rem",
                py: 1.4,
                mt: 0.5,
                "&.Mui-disabled": { opacity: 0.45 },
              }}
            >
              {loading
                ? tab === "register"
                  ? "Creating account…"
                  : "Signing in…"
                : tab === "register"
                  ? "Create Account"
                  : "Sign In"}
            </Button>

            <Typography
              variant="caption"
              sx={{
                color: "rgba(230, 220, 196, 0.38)",
                fontFamily: FONTS.MEDIEVAL_SERIF,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {tab === "register"
                ? "Already have an account? Switch to Sign In above."
                : "Don't have an account? Switch to Register above."}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UserAuthModal;
