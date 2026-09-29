import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { verifyEmailRequest } from "../../utils/authApi";
import { goldButtonSx, headingSx, bodySx } from "../../lib/medievalStyles";

type Status = "working" | "success" | "invalid" | "conflict";

/** Landing page for the link in the verification email: /verify-email?token=… */
export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("working");
  // React 18 StrictMode double-invokes effects; a single-use token must only be spent once.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("invalid");
      return;
    }

    void verifyEmailRequest({ token })
      .then((result) => {
        if (result.ok) setStatus("success");
        else setStatus(result.conflict ? "conflict" : "invalid");
      })
      .catch(() => setStatus("invalid"));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" sx={{ ...headingSx, mb: 3 }}>
        Email Verification
      </Typography>

      <Stack spacing={3}>
        {status === "working" && (
          <CircularProgress sx={{ color: "medievalGold.main" }} />
        )}

        {status === "success" && (
          <>
            <Alert severity="success">
              Your email is verified. You can now reset your password if you
              ever forget it.
            </Alert>
            <Link href="/account">
              <Button variant="contained" sx={{ ...goldButtonSx }}>
                Go To Your Account
              </Button>
            </Link>
          </>
        )}

        {status === "conflict" && (
          <Alert severity="error">
            That address is already verified on another account. Sign in to that
            account, or use a different address.
          </Alert>
        )}

        {status === "invalid" && (
          <>
            <Alert severity="error">
              This verification link is invalid or has expired.
            </Alert>
            <Typography sx={bodySx}>
              Sign in and request a new link from your account page.
            </Typography>
            <Link href="/account">
              <Button variant="contained" sx={{ ...goldButtonSx }}>
                Go To Your Account
              </Button>
            </Link>
          </>
        )}
      </Stack>
    </Container>
  );
}
