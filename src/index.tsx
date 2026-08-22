/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { Show, Component } from 'solid-js';
import 'solid-devtools';

import App from './App';
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import StockDashboard from "./pages/StockDashboard";
import Portfolio from "./pages/Portfolio";
import Dividend from "./pages/Dividend";
import QuickPortfolio from "./pages/QuickPortfolio";
import TradingJournal from "./pages/TradingJournal";
import MarketCapList from "./pages/MarketCapList";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/authContext";

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

const withAuth = (Comp: Component<any>): Component<any> => {
  return (props: any) => (
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
      <Route path="/transactions" component={withAuth(Transactions)} />
      <Route path="/budgets" component={withAuth(Budgets)} />
      <Route path="/goals" component={withAuth(Goals)} />
      <Route path="/reports" component={withAuth(Reports)} />
      <Route path="/stock/:ticker" component={withAuth(StockDashboard)} />
      <Route path="/markets/list" component={withAuth(MarketCapList)} />
      <Route path="/portfolio" component={withAuth(Portfolio)} />
      <Route path="/portfolio/:id" component={withAuth(Portfolio)} />
      <Route path="/portfolio/:id/trades" component={withAuth(Portfolio)} />
      <Route path="/quick-portfolio" component={withAuth(QuickPortfolio)} />
      <Route path="/dividend" component={withAuth(Dividend)} />
      <Route path="/trading-journal" component={withAuth(TradingJournal)} />
    </Router>
  ),
  root!
);
