import { A, useLocation } from "@solidjs/router";
import DashboardIcon from "@suid/icons-material/DashboardOutlined";
import ReceiptIcon from "@suid/icons-material/ReceiptLongOutlined";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import FlagIcon from "@suid/icons-material/FlagOutlined";
import AssessmentIcon from "@suid/icons-material/AssessmentOutlined";
import ShowChartIcon from "@suid/icons-material/ShowChartOutlined";
import PieChartIcon from "@suid/icons-material/PieChartOutlined";

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside class="w-[220px] h-screen bg-white border-r border-forest/10 flex flex-col shrink-0">
      {/* Logo */}
      <div class="p-8 flex items-center gap-3">
        <div class="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-white">
          <span class="material-icons text-2xl">eco</span>
        </div>
        <h1 class="text-2xl font-cormorant text-forest tracking-tight">Finly Zen</h1>
      </div>

      {/* Nav Links */}
      <nav class="flex-1 px-4 space-y-2 mt-4">
        <div class="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-earth/60">Expense Tracker</div>
        <A href="/" end class={`nav-link ${isActive("/") ? "active" : ""}`}>
          <DashboardIcon />
          <span class="font-outfit">Dashboard</span>
        </A>
        <A href="/transactions" class={`nav-link ${isActive("/transactions") ? "active" : ""}`}>
          <ReceiptIcon />
          <span class="font-outfit">Transactions</span>
        </A>
        <A href="/budgets" class={`nav-link ${isActive("/budgets") ? "active" : ""}`}>
          <AccountBalanceWalletIcon />
          <span class="font-outfit">Budgets</span>
        </A>
        <A href="/goals" class={`nav-link ${isActive("/goals") ? "active" : ""}`}>
          <FlagIcon />
          <span class="font-outfit">Goals</span>
        </A>
        <A href="/reports" class={`nav-link ${isActive("/reports") ? "active" : ""}`}>
          <AssessmentIcon />
          <span class="font-outfit">Reports</span>
        </A>

        <div class="px-4 mt-8 mb-2 text-[10px] font-bold uppercase tracking-widest text-earth/60">Financial Management</div>
        <A href="/stock/AAPL" class={`nav-link ${location.pathname.startsWith("/stock") ? "active" : ""}`}>
          <ShowChartIcon />
          <span class="font-outfit">Markets</span>
        </A>
        <A href="/portfolio" class={`nav-link ${isActive("/portfolio") || location.pathname.startsWith("/portfolio") ? "active" : ""}`}>
          <PieChartIcon />
          <span class="font-outfit">Portfolio</span>
        </A>
      </nav>
    </aside>
  );
};

export default Sidebar;
