import { ParentProps, Show, onMount, createSignal, createEffect, createMemo, on } from "solid-js";
import MainLayout from "./components/layout/MainLayout";
import { state, setupPersistence, loadSyncedBudgets, clearBudgetSync } from "./store";
import { setupPortfolioPersistence, loadPortfolios } from "./store/portfolioStore";
import { setupPriceAlertPersistence } from "./store/priceAlertStore";
import { setupIntelligencePersistence, switchIntelligenceUser } from "./store/intelligenceStore";
import { endIntelligenceSession } from "./services/intelligence/chatOrchestrator";
import { fetchUsdRate } from "./data/portfolioData";
import { setUsdRateOnce } from "./utils/format";
import AddIcon from "@suid/icons-material/Add";
import { useLocation } from "@solidjs/router";
import { AuthProvider, useAuth } from "./context/authContext";
import { getAccounts } from "./data/expenseData";
import FirstTimeSetupModal from "./components/auth/FirstTimeSetupModal";

import {
  openCreateTransaction,
  initializeTransactions,
  setupTransactionListener,
  resetTransactionStore,
} from "./store/transactionStore";

const AppContent = (props: ParentProps) => {
  setupPersistence();
  setupPortfolioPersistence();
  setupPriceAlertPersistence();
  setupIntelligencePersistence();

  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [accountStatus, setAccountStatus] = createSignal<"loading" | "setup" | "ready" | "error">("loading");
  const activeUserId = createMemo(() => isLoading() ? null : user()?.id ?? null);

  onMount(async () => {
    const rate = await fetchUsdRate();
    setUsdRateOnce(rate);
  });

  createEffect(on(activeUserId, (uid) => {
    endIntelligenceSession();
    switchIntelligenceUser(uid);
    resetTransactionStore(Boolean(uid));
    setAccountStatus("loading");
    if (uid) {
      void initializeTransactions();
      setupTransactionListener();
      void checkUserAccounts(uid);
      void loadSyncedBudgets(uid);
    } else {
      clearBudgetSync();
    }
  }));

  const checkUserAccounts = async (uid: string) => {
    setAccountStatus("loading");
    try {
      const accounts = await getAccounts(uid);
      if (activeUserId() === uid) {
        setAccountStatus(accounts.some(account => !account.setup_pending) ? "ready" : "setup");
      }
    } catch (error) {
      if (activeUserId() === uid) setAccountStatus("error");
      console.error("Failed to check user accounts:", error);
    }
  };

  const handleOnboardingComplete = async () => {
    setAccountStatus("ready");
    window.dispatchEvent(new CustomEvent("finly:accounts-changed"));
    await Promise.all([loadPortfolios(), initializeTransactions(true)]);
  };

  const isPublicPage = () => {
    const p = location.pathname;
    if (p === "/login" || p === "/register") return true;
    if (p === "/" && !isAuthenticated()) return true;
    return false;
  };

  const shouldHideAddButton = () =>
    state.ui.insightsOpen ||
    location.pathname.startsWith("/stock") ||
    location.pathname.startsWith("/markets") ||
    location.pathname.startsWith("/portfolio") ||
    location.pathname.startsWith("/quick-portfolio") ||
    location.pathname.startsWith("/dividend") ||
    location.pathname.startsWith("/trading-journal");

  return (
    <div class="relative min-h-dvh bg-page-bg">
      <Show
        when={!isPublicPage()}
        fallback={
          <main class="min-h-dvh">
            {props.children}
          </main>
        }
      >
        <MainLayout>
          {props.children}
        </MainLayout>

        {/* First Time Onboarding Wizard */}
        <Show when={accountStatus() === "setup" && activeUserId()} keyed>
          {uid => (
            <FirstTimeSetupModal
              userId={uid}
              onComplete={() => { if (activeUserId() === uid) void handleOnboardingComplete(); }}
            />
          )}
        </Show>

        <Show when={accountStatus() === "error" && activeUserId()}>
          <div role="alert" class="fixed bottom-6 left-4 z-50 premium-card p-4 bg-white">
            <p>We couldn’t load your accounts.</p>
            <button class="text-forest underline" onClick={() => void checkUserAccounts(activeUserId()!)}>Retry</button>
          </div>
        </Show>

        {/* Global Add Button - Hidden on Stock / Management pages */}
        <Show when={activeUserId() && accountStatus() === "ready" && !shouldHideAddButton()}>
          <button
            onClick={() => openCreateTransaction()}
            class="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-12 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-spring text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-40 group cursor-pointer hover:bg-forest duration-300 active:scale-95"
            classList={{
              "right-4 sm:right-8 lg:right-10": !state.ui.insightsOpen,
            }}
            aria-label="Add transaction"
          >
            <AddIcon class="text-2xl lg:text-3xl group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </Show>
      </Show>
    </div>
  );
};

const App = (props: ParentProps) => {
  return (
    <AuthProvider>
      <AppContent>{props.children}</AppContent>
    </AuthProvider>
  );
};

export default App;
