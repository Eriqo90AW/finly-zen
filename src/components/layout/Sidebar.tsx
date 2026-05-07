import { A, useLocation } from "@solidjs/router";
import DashboardIcon from "@suid/icons-material/DashboardOutlined";
import ReceiptIcon from "@suid/icons-material/ReceiptLongOutlined";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import FlagIcon from "@suid/icons-material/FlagOutlined";
import AssessmentIcon from "@suid/icons-material/AssessmentOutlined";
import { state } from "../../store";

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Mock score for now
  const score = 84;
  const strokeDasharray = `${(score / 100) * 188} 188`;

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
        <A href="/" class={`nav-link ${isActive("/") ? "active" : ""}`}>
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
      </nav>

      {/* Monthly Health Score */}
      <div class="p-6 m-4 bg-sage/30 rounded-2xl flex flex-col items-center">
        <div class="relative w-24 h-24 flex items-center justify-center">
          <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="currentColor"
              stroke-width="8"
              fill="transparent"
              class="text-forest/10"
            />
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="currentColor"
              stroke-width="8"
              fill="transparent"
              stroke-dasharray={strokeDasharray}
              stroke-linecap="round"
              class="text-forest"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center pt-1">
            <span class="text-xl font-cormorant text-forest leading-none">{score}</span>
            <span class="text-[10px] font-outfit uppercase tracking-widest text-forest/60">Zen</span>
          </div>
        </div>
        <div class="mt-3 text-center">
          <p class="text-sm font-outfit font-medium text-forest">Thriving</p>
          <p class="text-[10px] text-earth">Monthly Health Score</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
