import { createMemo, Show, onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import { portfolioState, loadPortfolios } from "../store/portfolioStore";
import { PortfolioOverview } from "../components/screen-portfolio/PortfolioOverview";
import { PortfolioDetails } from "../components/screen-portfolio/PortfolioDetails";
import { fetchUsdRate } from "../data/portfolioData";
import { setUsdExchangeRate } from "../utils/format";

const Portfolio = () => {
  const params = useParams();
  const activePortfolio = createMemo(() => {
    if (!params.id) return null;
    return portfolioState.portfolios.find(p => p.id === params.id) || null;
  });

  onMount(async () => {
    // 1. Load live USD rate first
    const rate = await fetchUsdRate();
    setUsdExchangeRate(rate);

    // 2. Load portfolios & transactions from Supabase
    await loadPortfolios();
  });

  return (
    <div class="max-w-[1400px] mx-auto min-h-screen">
      <Show 
        when={activePortfolio()} 
        fallback={<PortfolioOverview />}
      >
        {(portfolio) => <PortfolioDetails portfolio={portfolio()} />}
      </Show>
    </div>
  );
};

export default Portfolio;


