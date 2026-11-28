import { AssetLogo } from "../../../../components/common/AssetLogo";
import type { PortfolioAsset } from "../../../../types";
import { getAssetColor } from "../../../../utils/colors";
import { formatPortfolioValue } from "../../../../utils/format";
import { getMarketStatus } from "../../../../utils/marketTime";
import { getActiveAssetPrice } from "./assetsListHelpers";

interface AssetsListRowProps {
  asset: PortfolioAsset;
  currency: "IDR" | "USD";
  portfolioNativeCurrency?: "IDR" | "USD";
  onSelect: (asset: PortfolioAsset) => void;
  onNavigateStock: (ticker: string) => void;
  onOpenTargetModal: (asset: PortfolioAsset) => void;
  onDelete: (assetId: string) => void;
}

const AssetMiniDonut = (props: { percentage: number; color: string }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = () =>
    circumference - (props.percentage / 100) * circumference;

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      class="transform -rotate-90"
    >
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        stroke-width="3.5"
        fill="transparent"
        class="text-forest/10"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke={props.color}
        stroke-width="3.5"
        fill="transparent"
        stroke-dasharray={`${circumference}`}
        stroke-dashoffset={`${strokeDashoffset()}`}
        stroke-linecap="round"
        class="transition-[stroke-dashoffset] duration-1000 ease-out"
      />
    </svg>
  );
};

export const AssetsListRow = (props: AssetsListRowProps) => {
  const assetColor = () => getAssetColor(props.asset.ticker);

  const metrics = () => {
    const { session } = getMarketStatus();
    const activePrice = getActiveAssetPrice(props.asset, session);
    const costBasis = props.asset.totalShares * props.asset.averagePrice;
    const effectiveCurrentValue = props.asset.totalShares * activePrice;
    const effectiveTotalGainLoss = effectiveCurrentValue - costBasis;
    const gainPercent =
      costBasis === 0 ? 0 : (effectiveTotalGainLoss / costBasis) * 100;

    return {
      activePrice,
      costBasis,
      effectiveCurrentValue,
      effectiveTotalGainLoss,
      gainPercent,
      isPositive: effectiveTotalGainLoss >= 0,
    };
  };

  return (
    <div
      onClick={() => props.onSelect(props.asset)}
      class="group flex items-center px-8 py-5 border-b border-forest/5 hover:bg-earth/5 transition-colors duration-200 cursor-pointer relative"
    >
      <div
        class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
        style={{ "background-color": assetColor() }}
      />

      {/* Name Column */}
      <div class="flex-[2] pr-4 flex items-center gap-4 min-w-0">
        <AssetLogo
          ticker={props.asset.ticker}
          logoUrl={props.asset.logoUrl}
          name={props.asset.name}
          size="lg"
          class="w-10 h-10 rounded-xl shadow-xs border border-forest/10"
          imageClass="object-contain p-1 bg-white"
          fallbackType="letter"
        />
        <div class="flex flex-col min-w-0">
          <span
            onClick={(e) => {
              e.stopPropagation();
              props.onNavigateStock(props.asset.ticker);
            }}
            class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors hover:underline cursor-pointer"
          >
            {props.asset.ticker}
          </span>
          <span class="text-xs text-earth/60 truncate max-w-[180px]">
            {props.asset.name}
          </span>
        </div>
      </div>

      {/* Value Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span class="font-outfit font-bold text-forest text-base leading-tight">
          {formatPortfolioValue(
            metrics().effectiveCurrentValue,
            props.currency,
            false,
            props.portfolioNativeCurrency,
          )}
        </span>
        <span class="text-[11px] text-earth/60 font-medium">
          {formatPortfolioValue(
            metrics().costBasis,
            props.currency,
            false,
            props.portfolioNativeCurrency,
          )}
        </span>
      </div>

      {/* Price / Avg Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span class="font-outfit font-medium text-forest text-sm">
          {formatPortfolioValue(
            metrics().activePrice,
            props.currency,
            false,
            props.portfolioNativeCurrency,
          )}
        </span>
        <span class="text-[11px] text-earth/60 font-medium">
          {formatPortfolioValue(
            props.asset.averagePrice,
            props.currency,
            false,
            props.portfolioNativeCurrency,
          )}
        </span>
      </div>

      {/* Gain Column */}
      <div class="flex-1 flex flex-col items-end gap-0.5">
        <span
          class={`font-outfit font-bold text-sm ${
            metrics().isPositive ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {metrics().isPositive ? "+" : ""}
          {formatPortfolioValue(
            metrics().effectiveTotalGainLoss,
            props.currency,
            false,
            props.portfolioNativeCurrency,
          )}
        </span>
        <div
          class={`flex items-center text-[11px] font-bold ${
            metrics().isPositive ? "text-emerald-600/80" : "text-rose-500/80"
          }`}
        >
          <span class="material-icons !text-[16px]">
            {metrics().isPositive ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
          {Math.abs(metrics().gainPercent).toFixed(2)}%
        </div>
      </div>

      {/* Allocation Column */}
      <div class="w-32 flex justify-end items-center gap-3 relative">
        <AssetMiniDonut
          percentage={props.asset.actualAllocation}
          color={assetColor()}
        />
        <div class="flex flex-col items-end">
          <span class="font-outfit text-forest font-bold text-sm">
            {props.asset.actualAllocation.toFixed(1)}%
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onOpenTargetModal(props.asset);
            }}
            class="flex items-center gap-0.5 font-outfit text-earth/60 text-xs font-medium bg-transparent cursor-pointer hover:underline"
            title="Set Target Allocation"
          >
            <span>{props.asset.targetAllocation.toFixed(1)}%</span>
          </button>
        </div>
      </div>

      {/* Action Column */}
      <div class="w-12 flex justify-end items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete(props.asset.id);
          }}
          class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/20 hover:text-rose-500 pt-1.5 px-1 hover:bg-rose-50 rounded-md cursor-pointer"
          title="Delete Portfolio"
        >
          <span class="material-icons text-base">delete_outline</span>
        </button>
      </div>
    </div>
  );
};
