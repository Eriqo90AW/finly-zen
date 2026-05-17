import { createMemo, Show } from "solid-js";
import { portfolioState } from "../store/portfolioStore";
import { PortfolioOverview } from "../components/screen-portfolio/PortfolioOverview";
import { PortfolioDetails } from "../components/screen-portfolio/PortfolioDetails";

const Portfolio = () => {
  const activePortfolio = createMemo(() => {
    return portfolioState.portfolios.find(p => p.id === portfolioState.activePortfolioId) || null;
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

