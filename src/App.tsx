import { Button, CircularProgress, Grid, Box, Typography, Container } from '@mui/material'
import './App.css'
import { lazy, Suspense, type JSX } from 'react';
import { Route, Router, Switch } from "wouter";
import Footer from './components/shared/Footer';
import Navigation from './components/shared/Navigation';
import PageTransition from './components/shared/PageTransition';
import confusedTravolta from './assets/images/confused-john-travolta.gif';
import { FONTS } from './lib/globals';
import ErrorBoundary from './components/shared/ErrorBoundary';

type LazyComponentT = React.LazyExoticComponent<() => JSX.Element>;

// Enhanced Loading Component
const LoadingSpinner = () => (
  <Container
    maxWidth={false}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      backgroundColor: '#121212'
    }}
  >
    <CircularProgress
      size={60}
      sx={{
        color: '#bdeb92ff',
        mb: 2
      }}
    />
    <Typography
      variant="h6"
      fontFamily={FONTS.ANTON}
      sx={{
        color: '#bdeb92ff',
        textAlign: 'center'
      }}
    >
      Loading...
    </Typography>
  </Container>
);

function LC(Component: LazyComponentT) {
  return () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Component />
      </Suspense>
    );
  };
}

function Custom404() {
  return (
    <Container sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      textAlign: 'center',
      color: '#bdeb92ff'
    }}>
      <img
        src={confusedTravolta}
        alt="Confused John Travolta"
        style={{
          maxWidth: '300px',
          width: '100%',
          height: 'auto',
          marginBottom: '1rem'
        }}
      />
      <Typography
        variant="h3"
        fontFamily={FONTS.ANTON}
        sx={{ mb: 2 }}
      >
        *Visible Confusion*
      </Typography>
      <Typography
        variant="h6"
        fontFamily={FONTS.NECTO_MONO}
        sx={{ mb: 3 }}
      >
        (404, this page doesn't exist...)
      </Typography>
      <Button
        variant="contained"
        onClick={() => window.location.href = "/"}
        sx={{
          backgroundColor: '#bdeb92ff',
          color: '#121212',
          fontFamily: FONTS.ANTON,
          fontSize: '1.25rem',
          '&:hover': {
            backgroundColor: '#a8d67eff'
          }
        }}
      >
        Go To Home
      </Button>
    </Container>
  )
}

const LandingPage = LC(lazy(() => import("./pages/landing/LandingPage")));
const ProjectsPage = LC(lazy(() => import("./pages/projects/ProjectsPage")));
const GamesPage = LC(lazy(() => import("./pages/games/GamesPage")));
const ExperiencePage = LC(lazy(() => import("./pages/experience/ExperiencePage")));

export function Routes() {
  return (
    <Router>
      <PageTransition>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/games" component={GamesPage} />
          <Route path="/experience" component={ExperiencePage} />
          <Route>
            <Custom404 />
          </Route>
        </Switch>
      </PageTransition>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: '100vw',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
        backgroundSize: 'auto',
        backgroundColor: '#090c0c',
      }}>
        {/* Navigation */}
        <Navigation />

        {/* Main content area */}
        <Box sx={{ flex: 1 }}>
          <Grid container spacing={0}>
            <Grid size={12}>
              <Routes />
            </Grid>
          </Grid>
        </Box>

        {/* Footer area */}
        <Box>
          <Grid container spacing={0}>
            <Grid size={12}>
              <Footer />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ErrorBoundary>
  )
}

export default App
