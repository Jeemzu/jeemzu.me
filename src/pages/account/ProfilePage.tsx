import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useAuthStore } from "../../stores/authStore";
import {
  changePasswordRequest,
  changeUsernameRequest,
  getProfileRequest,
  resendVerificationRequest,
  updateProfilePreferencesRequest,
} from "../../utils/profileApi";
import type { components } from "../../types/api.generated";
import { FONTS } from "../../lib/globals";
import {
  bodySx,
  fieldSx,
  goldButtonSx,
  headingSx,
  panelSx,
} from "../../lib/medievalStyles";

type Profile = components["schemas"]["ProfileResponse"];

type Feedback = { severity: "success" | "error"; message: string } | null;

const SectionPanel = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ ...panelSx, p: 3 }}>
    <Typography variant="h6" sx={{ ...headingSx, mb: 0.5 }}>
      {title}
    </Typography>
    <Typography variant="caption" sx={{ ...bodySx, display: "block", mb: 2 }}>
      {description}
    </Typography>
    {children}
  </Box>
);

export default function ProfilePage() {
  const { isAuthenticated, isInitialized, applyToken } = useAuthStore();
  const [, navigate] = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<Feedback>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState<Feedback>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) navigate("/", { replace: true });
  }, [isInitialized, isAuthenticated, navigate]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getProfileRequest();
      setProfile(data);
      setNewUsername(data.username ?? "");
    } catch {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadProfile();
  }, [isAuthenticated, loadProfile]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === profile?.username) return;

    setUsernameBusy(true);
    setUsernameFeedback(null);
    try {
      const result = await changeUsernameRequest({ username: trimmed });
      if ("conflict" in result) {
        setUsernameFeedback({
          severity: "error",
          message: `'${trimmed}' is already taken.`,
        });
      } else {
        // The rename signs out other sessions, so adopt the reissued token here.
        applyToken(result.token, trimmed);
        setProfile((p) => (p ? { ...p, username: trimmed } : p));
        setUsernameFeedback({
          severity: "success",
          message: "Username updated. Other sessions were signed out.",
        });
      }
    } catch {
      setUsernameFeedback({
        severity: "error",
        message: "Could not update your username. Please try again.",
      });
    }
    setUsernameBusy(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 8) {
      setPasswordFeedback({
        severity: "error",
        message: "New password must be at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        severity: "error",
        message: "New passwords don't match.",
      });
      return;
    }

    setPasswordBusy(true);
    setPasswordFeedback(null);
    try {
      const token = await changePasswordRequest({
        currentPassword,
        newPassword,
      });
      if (!token) {
        setPasswordFeedback({
          severity: "error",
          message: "Current password is incorrect.",
        });
      } else {
        applyToken(token, profile?.username ?? "");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordFeedback({
          severity: "success",
          message: "Password changed. Other sessions were signed out.",
        });
      }
    } catch {
      setPasswordFeedback({
        severity: "error",
        message: "Could not change your password. Please try again.",
      });
    }
    setPasswordBusy(false);
  };

  const savePreference = async (
    patch: components["schemas"]["UpdateUserRequest"],
  ) => {
    setPrefsBusy(true);
    setPrefsFeedback(null);
    try {
      setProfile(await updateProfilePreferencesRequest(patch));
      setPrefsFeedback({ severity: "success", message: "Preferences saved." });
    } catch {
      setPrefsFeedback({
        severity: "error",
        message: "Could not save your preferences.",
      });
    }
    setPrefsBusy(false);
  };

  const handleResend = async () => {
    setVerifyFeedback(null);
    try {
      await resendVerificationRequest();
      setVerifyFeedback({
        severity: "success",
        message: "Verification email sent. Check your inbox.",
      });
    } catch {
      setVerifyFeedback({
        severity: "error",
        message: "Could not send the verification email.",
      });
    }
  };

  if (!isInitialized || loading) {
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

  if (!profile) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">
          We couldn't load your account settings. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ ...headingSx, mb: 3 }}>
        Your Jeemzu Account
      </Typography>

      <Stack spacing={3}>
        <SectionPanel
          title="Email"
          description="Used only to recover your account and, if you choose, to send you site updates."
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ ...bodySx, color: "parchment.main" }}>
                {profile.email ?? "No address on file"}
              </Typography>
              {profile.email && (
                <Chip
                  size="small"
                  label={profile.emailVerified ? "Verified" : "Unverified"}
                  sx={{
                    fontFamily: FONTS.MEDIEVAL_SERIF,
                    color: profile.emailVerified ? "#8fbf8f" : "#e0b880",
                    bgcolor: profile.emailVerified
                      ? "rgba(143, 191, 143, 0.12)"
                      : "rgba(224, 184, 128, 0.12)",
                  }}
                />
              )}
            </Stack>

            {profile.email && !profile.emailVerified && (
              <>
                <Typography variant="caption" sx={bodySx}>
                  Verify this address to enable password resets.
                </Typography>
                <Button
                  onClick={() => void handleResend()}
                  variant="contained"
                  sx={{ ...goldButtonSx, alignSelf: "flex-start" }}
                >
                  Resend Verification
                </Button>
              </>
            )}

            {verifyFeedback && (
              <Alert severity={verifyFeedback.severity}>
                {verifyFeedback.message}
              </Alert>
            )}
          </Stack>
        </SectionPanel>

        <SectionPanel
          title="Username"
          description="Your display name on leaderboards."
        >
          <Box component="form" onSubmit={handleUsernameSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                disabled={usernameBusy}
                inputProps={{ maxLength: 50 }}
                fullWidth
                sx={fieldSx}
              />
              {usernameFeedback && (
                <Alert severity={usernameFeedback.severity}>
                  {usernameFeedback.message}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={
                  usernameBusy ||
                  !newUsername.trim() ||
                  newUsername.trim() === profile.username
                }
                sx={{ ...goldButtonSx, alignSelf: "flex-start" }}
              >
                {usernameBusy ? "Saving…" : "Change Username"}
              </Button>
            </Stack>
          </Box>
        </SectionPanel>

        <SectionPanel
          title="Password"
          description="Changing your password signs out every other device."
        >
          <Box component="form" onSubmit={handlePasswordSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={passwordBusy}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={passwordBusy}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={passwordBusy}
                fullWidth
                sx={fieldSx}
              />
              {passwordFeedback && (
                <Alert severity={passwordFeedback.severity}>
                  {passwordFeedback.message}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={passwordBusy || !currentPassword || !newPassword}
                sx={{ ...goldButtonSx, alignSelf: "flex-start" }}
              >
                {passwordBusy ? "Saving…" : "Change Password"}
              </Button>
            </Stack>
          </Box>
        </SectionPanel>

        <SectionPanel
          title="Preferences"
          description="Control where your name appears and what lands in your inbox."
        >
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={profile.optedIn ?? false}
                  disabled={prefsBusy}
                  onChange={(e) =>
                    void savePreference({ optedIn: e.target.checked })
                  }
                />
              }
              label="Show my scores on global leaderboards"
              sx={{ "& .MuiFormControlLabel-label": bodySx }}
            />
            <Divider sx={{ borderColor: "rgba(200, 162, 74, 0.16)" }} />
            <FormControlLabel
              control={
                <Switch
                  checked={profile.emailListSubscribed ?? false}
                  disabled={prefsBusy}
                  onChange={(e) =>
                    void savePreference({
                      emailListSubscribed: e.target.checked,
                    })
                  }
                />
              }
              label="Email me site news and notifications"
              sx={{ "& .MuiFormControlLabel-label": bodySx }}
            />
            {prefsFeedback && (
              <Alert severity={prefsFeedback.severity}>
                {prefsFeedback.message}
              </Alert>
            )}
          </Stack>
        </SectionPanel>
      </Stack>
    </Container>
  );
}
