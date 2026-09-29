import { useState } from "react";
import { Link } from "wouter";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { resetPasswordRequest } from "../../utils/authApi";
import {
  bodySx,
  fieldSx,
  goldButtonSx,
  headingSx,
} from "../../lib/medievalStyles";

/** Landing page for the link in the reset email: /reset-password?token=… */
export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      if (await resetPasswordRequest({ token, newPassword: password })) {
        setDone(true);
      } else {
        setError("This reset link is invalid or has expired.");
      }
    } catch {
      setError("Could not reset your password. Please try again later.");
    }
    setBusy(false);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" sx={{ ...headingSx, mb: 3 }}>
        Choose A New Password
      </Typography>

      {!token && (
        <Alert severity="error">
          This reset link is missing its token. Request a new one from the sign
          in window.
        </Alert>
      )}

      {done ? (
        <Stack spacing={3}>
          <Alert severity="success">
            Your password has been reset and all other sessions were signed out.
          </Alert>
          <Typography sx={bodySx}>
            You can now sign in with your new password.
          </Typography>
          <Link href="/">
            <Button variant="contained" sx={{ ...goldButtonSx }}>
              Back To Home
            </Button>
          </Link>
        </Stack>
      ) : (
        token && (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
                fullWidth
                sx={fieldSx}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !password || !confirmPassword}
                sx={{ ...goldButtonSx, alignSelf: "flex-start" }}
              >
                {busy ? "Saving…" : "Reset Password"}
              </Button>
            </Stack>
          </Box>
        )
      )}
    </Container>
  );
}
