import { Button, CircularProgress, CssBaseline, Grid, Box } from '@mui/material'
import './App.css'
import { lazy, Suspense, type JSX } from 'react';
import { Route, Router, Switch } from "wouter";
import Footer from './components/Footer';

type LazyComponentT = React.LazyExoticComponent<() => JSX.Element>;

function LC(Component: LazyComponentT) {
  return () => {
    return (
      <Suspense fallback={<CircularProgress className="mx-auto my-20" size="3" />}>
        <Component />
      </Suspense >
    );
  };
}

function Custom404() {
  return (
    <div className="grid grid-flow-col grid-rows-2 gap-4 justify-center my-auto">
      <img className="row-span-2 col-span-2" src="./src/assets/images/confused-john-travolta.gif" alt="404 Not Found" />
      <span>
        <h1 className="text-2xl font-bold">*Visible Confusion*</h1>
        <p>(404, this page doesn't exist...)</p>
      </span>
      <Button className="" onClick={() => window.location.href = "/"}>
        Go To Home
      </Button>
    </div>
  )
}

const Home = LC(lazy(() => import("./components/MainContent")));

export function Routes() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={Home} />
        <Route>
          <Custom404 />
        </Route>
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: '100vw',
      backgroundColor: '#121212'
    }}>
      {/* Main content area */}
      <Box>
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
  )
}

export default App
