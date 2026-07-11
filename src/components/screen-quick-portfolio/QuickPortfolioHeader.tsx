interface QuickPortfolioHeaderProps {
  lastUpdatedLabel: string;
}

export const QuickPortfolioHeader = (props: QuickPortfolioHeaderProps) => {
  return (
    <div class="flex justify-between items-end">
      <div>
        <h2 class="font-headline-xl text-3xl font-bold text-forest">Quick Portfolio</h2>
        <p class="font-body-md text-sm text-earth mt-1">Real-time asset management and performance tracking.</p>
      </div>
      <div class="flex gap-3 items-center select-none">
        <div class="font-label-sm text-xs text-earth flex items-center gap-1.5 px-1 py-1">
          <span class="italic underline">Last updated: {props.lastUpdatedLabel}</span>
        </div>
      </div>
    </div>
  );
};
