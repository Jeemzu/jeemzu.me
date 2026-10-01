import { Button, Grid, Box, Typography, Container } from "@mui/material";
import "./App.css";
import { lazy, Suspense, useEffect, type JSX } from "react";
import { Route, Router, Switch } from "wouter";
import Footer from "./components/shared/Footer";
import Navigation from "./components/shared/Navigation";
import PageTransition, { PageEnter } from "./components/shared/PageTransition";
import confusedTravolta from "./assets/images/confused-john-travolta.gif";
import { FONTS } from "./lib/globals";
import { goldButtonSx } from "./lib/medievalStyles";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { useAuthStore } from "./stores/authStore";
import DeveloperLayout from "./pages/developer/DeveloperLayout";

type LazyComponentT = React.LazyExoticComponent<() => JSX.Element | null>;

function LC(Component: LazyComponentT) {
  return () => {
    return (
      // Invisible spacer keeps the footer below the fold while a chunk loads.
      <Suspense fallback={<Box sx={{ minHeight: "100vh" }} />}>
        <PageEnter>
          <Component />
        </PageEnter>
      </Suspense>
    );
  };
}

function Custom404() {
  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        textAlign: "center",
        color: "#e8cf8f",
      }}
    >
      <img
        src={confusedTravolta}
        alt="Confused John Travolta"
        style={{
          maxWidth: "300px",
          width: "100%",
          height: "auto",
          marginBottom: "1rem",
        }}
      />
      <Typography
        variant="h3"
        fontFamily={FONTS.MEDIEVAL_DISPLAY}
        sx={{ mb: 2, letterSpacing: "0.06em" }}
      >
        *Visible Confusion*
      </Typography>
      <Typography
        variant="h6"
        fontFamily={FONTS.MEDIEVAL_SERIF}
        sx={{ mb: 3, fontStyle: "italic", color: "#a79c85" }}
      >
        (404, this page doesn't exist...)
      </Typography>
      <Button
        variant="contained"
        onClick={() => (window.location.href = "/")}
        sx={{
          ...goldButtonSx,
          fontSize: "1.25rem",
        }}
      >
        Go To Home
      </Button>
    </Container>
  );
}

const HomePage = LC(lazy(() => import("./pages/home/HomePage")));
const AboutPage = LC(lazy(() => import("./pages/developer/AboutPage")));
const ProjectsPage = LC(lazy(() => import("./pages/developer/ProjectsPage")));
const GamesPage = LC(lazy(() => import("./pages/games/GamesPage")));
const ExperiencePage = LC(
  lazy(() => import("./pages/developer/ExperiencePage")),
);
const LevelEditorPage = LC(
  lazy(() => import("./pages/editor/LevelEditorPage")),
);
const AlgoVizPage = LC(lazy(() => import("./pages/algoviz/AlgoVizPage")));
const GamePage = LC(lazy(() => import("./pages/games/GamePage")));
const AdminPage = LC(lazy(() => import("./pages/admin/AdminPage")));
const BudgetizePage = LC(lazy(() => import("./pages/budgetize/BudgetizePage")));
const ProfilePage = LC(lazy(() => import("./pages/account/ProfilePage")));
const VerifyEmailPage = LC(
  lazy(() => import("./pages/account/VerifyEmailPage")),
);
const ResetPasswordPage = LC(
  lazy(() => import("./pages/account/ResetPasswordPage")),
);

export function Routes() {
  return (
    <Router>
      <PageTransition>
        {(location) => (
          <Switch location={location}>
            <Route path="/" component={HomePage} />
            <Route path="/developer">
              <DeveloperLayout>
                <AboutPage />
              </DeveloperLayout>
            </Route>
            <Route path="/developer/experience">
              <DeveloperLayout>
                <ExperiencePage />
              </DeveloperLayout>
            </Route>
            <Route path="/developer/projects">
              <DeveloperLayout>
                <ProjectsPage />
              </DeveloperLayout>
            </Route>
            <Route path="/games/:id" component={GamePage} />
            <Route path="/games" component={GamesPage} />
            <Route path="/editor" component={LevelEditorPage} />
            <Route path="/algoviz" component={AlgoVizPage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/budgetize" component={BudgetizePage} />
            <Route path="/account" component={ProfilePage} />
            <Route path="/verify-email" component={VerifyEmailPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route>
              <PageEnter>
                <Custom404 />
              </PageEnter>
            </Route>
          </Switch>
        )}
      </PageTransition>
    </Router>
  );
}

function App() {
  useEffect(() => {
    // Attempt a silent token refresh on load to restore any active admin session.
    void useAuthStore.getState().initialize();
  }, []);
  useEffect(() => {
    const REFRESH_WINDOW_MS = 5 * 60 * 1000;
    // Tabs left in the background can outlive the access token; renew on return.
    function refreshIfStale() {
      if (document.visibilityState !== "visible") return;
      const { isAuthenticated, expiresAt, refreshSession } =
        useAuthStore.getState();
      if (isAuthenticated && expiresAt && expiresAt - Date.now() < REFRESH_WINDOW_MS)
        void refreshSession();
    }
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, []);
  return (
    <ErrorBoundary>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          minWidth: "100vw",
          backgroundRepeat: "repeat",
          backgroundAttachment: "fixed",
          backgroundSize: "auto",
          backgroundColor: "#0b0e14",
          backgroundImage: `radial-gradient(ellipse at 50% -10%, rgba(200, 162, 74, 0.13), transparent 58%),
            radial-gradient(ellipse at 12% 72%, rgba(63, 111, 168, 0.10), transparent 52%),
            radial-gradient(ellipse at 88% 58%, rgba(178, 58, 72, 0.09), transparent 52%),
            linear-gradient(180deg, #151a24 0%, #0d1017 55%, #080a0f 100%)`,
          // Candlelit pools that drift slowly behind the content.
          "&::before": {
            content: '""',
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(38% 46% at 18% 24%, rgba(200, 162, 74, 0.10), transparent 70%),
              radial-gradient(34% 42% at 84% 70%, rgba(63, 111, 168, 0.09), transparent 70%)`,
            animation: "jz-drift 26s ease-in-out infinite alternate",
          },
        }}
      >
        {/* Navigation */}
        <Navigation />

        {/* Main content area */}
        <Box sx={{ position: "relative", zIndex: 1, flex: 1 }}>
          <Grid container spacing={0}>
            <Grid size={12}>
              <Routes />
            </Grid>
          </Grid>
        </Box>

        {/* Footer area */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={0}>
            <Grid size={12}>
              <Footer />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ErrorBoundary>
  );
}

export default App;
