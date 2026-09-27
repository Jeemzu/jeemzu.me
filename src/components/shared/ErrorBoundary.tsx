import React from "react";
import { Container, Typography, Button } from "@mui/material";
import { FONTS } from "../../lib/globals";
import { goldButtonSx } from "../../lib/medievalStyles";

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container
          sx={{
            textAlign: "center",
            mt: 4,
            color: "#e8cf8f",
          }}
        >
          <Typography
            variant="h3"
            fontFamily={FONTS.MEDIEVAL_DISPLAY}
            sx={{ mb: 2, letterSpacing: "0.05em" }}
          >
            Oops! Something went wrong
          </Typography>
          <Button
            onClick={() => window.location.reload()}
            sx={{
              ...goldButtonSx,
              fontSize: "1.1rem",
            }}
          >
            Reload Page
          </Button>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
