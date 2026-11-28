/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, Route, type RouteSectionProps } from '@solidjs/router';
import { Show, lazy, type Component } from 'solid-js';

if (import.meta.env.DEV) {
  void import("solid-devtools");
}

import App from './App';
import { ProtectedRoute } from "./features/auth";
import { useAuth } from "./context/authContext";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Goals = lazy(() => import("./pages/Goals"));
const Reports = lazy(() => import("./pages/Reports"));
const StockDashboard = lazy(() => import("./pages/StockDashboard"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const QuickPortfolio = lazy(() => import("./pages/QuickPortfolio"));
const MarketCapList = lazy(() => import("./pages/MarketCapList"));

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

const RootView: Component = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <Show
      when={!isLoading()}
      fallback={
        <div class="min-h-screen bg-page-bg flex items-center justify-center">
          <div class="w-8 h-8 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
        </div>
      }
    >
      <Show when={isAuthenticated()} fallback={<Landing />}>
        <Dashboard />
      </Show>
    </Show>
  );
};

const withAuth = (Comp: Component<RouteSectionProps>): Component<RouteSectionProps> => {
  return (props) => (
    <ProtectedRoute>
      <Comp {...props} />
    </ProtectedRoute>
  );
};

render(
  () => (
    <Router root={App}>
      <Route path="/" component={RootView} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={withAuth(Dashboard)} />
      <Route path="/budgets" component={withAuth(Budgets)} />
      <Route path="/goals" component={withAuth(Goals)} />
      <Route path="/reports" component={withAuth(Reports)} />
      <Route path="/stock/:ticker" component={withAuth(StockDashboard)} />
      <Route path="/markets/list" component={withAuth(MarketCapList)} />
      <Route path="/portfolio" component={withAuth(Portfolio)} />
      <Route path="/portfolio/:id" component={withAuth(Portfolio)} />
      <Route path="/portfolio/:id/trades" component={withAuth(Portfolio)} />
      <Route path="/quick-portfolio" component={withAuth(QuickPortfolio)} />
    </Router>
  ),
  root!
);
