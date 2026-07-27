/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import 'solid-devtools';

import App from './App';
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

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/goals" component={Goals} />
      <Route path="/reports" component={Reports} />
      <Route path="/stock/:ticker" component={StockDashboard} />
      <Route path="/markets/list" component={MarketCapList} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/portfolio/:id" component={Portfolio} />
      <Route path="/portfolio/:id/trades" component={Portfolio} />
      <Route path="/quick-portfolio" component={QuickPortfolio} />
      <Route path="/dividend" component={Dividend} />
      <Route path="/trading-journal" component={TradingJournal} />
    </Router>
  ),
  root!
);
