import { createSignal, createMemo, createEffect, Show } from "solid-js";
import { getCachedLogo, setCachedLogo, isImagePreloaded, markImageLoaded } from "../../utils/logoCache";
import { getAssetColor } from "../../utils/colors";

export interface AssetLogoProps {
  ticker: string;
  logoUrl?: string;
  name?: string;
  category?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
  imageClass?: string;
  fallbackType?: "icon" | "letter" | "auto";
}

const sizeClasses: Record<string, { container: string; icon: string; text: string }> = {
  xs: { container: "w-5 h-5 rounded-md", icon: "!text-xs", text: "text-[9px]" },
  sm: { container: "w-7 h-7 rounded-lg", icon: "!text-sm", text: "text-[11px]" },
  md: { container: "w-9 h-9 rounded-xl", icon: "!text-base", text: "text-xs" },
  lg: { container: "w-10 h-10 rounded-xl", icon: "!text-lg", text: "text-sm" },
  xl: { container: "w-12 h-12 rounded-2xl", icon: "!text-xl", text: "text-base" },
};

export const AssetLogo = (props: AssetLogoProps) => {
  const sizeConfig = () => sizeClasses[props.size || "sm"] || sizeClasses.sm;

  // Resolve logo URL from props or synchronous persistent cache
  const effectiveLogoUrl = createMemo(() => {
    return props.logoUrl || getCachedLogo(props.ticker) || undefined;
  });

  // Keep cache in sync when new logoUrl is passed via props
  createEffect(() => {
    const url = props.logoUrl;
    if (url && props.ticker) {
      setCachedLogo(props.ticker, url);
    }
  });

  // Track image load and error states
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [hasError, setHasError] = createSignal(false);

  createEffect(() => {
    const url = effectiveLogoUrl();
    if (!url) {
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    if (isImagePreloaded(url)) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  });

  const getCategoryIcon = (cat?: string) => {
    if (!cat) {
      const t = props.ticker?.toUpperCase() || "";
      if (t.endsWith(".JK")) return "show_chart";
      if (t.endsWith("-USD") || t === "BTC" || t === "ETH") return "currency_bitcoin";
      return "phone_iphone";
    }
    const c = cat.toLowerCase();
    if (c.includes("crypto") || c.includes("bitcoin")) return "currency_bitcoin";
    if (c.includes("idx") || c.includes("stock") || c.includes("chart")) return "show_chart";
    return "phone_iphone";
  };

  const handleImageLoad = (url: string) => {
    markImageLoaded(url);
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const shouldShowImage = () => Boolean(effectiveLogoUrl()) && !hasError();

  return (
    <div
      class={`relative flex items-center justify-center shrink-0 overflow-hidden select-none ${
        props.class || `${sizeConfig().container} bg-sage text-forest`
      }`}
    >
      {/* Fallback Icon or Letter Badge (Always rendered underneath or as primary fallback) */}
      <Show
        when={!shouldShowImage() || !isLoaded()}
      >
        <div class="w-full h-full flex items-center justify-center">
          <Show
            when={props.fallbackType === "letter"}
            fallback={
              <span class={`material-icons ${sizeConfig().icon} text-forest`}>
                {getCategoryIcon(props.category)}
              </span>
            }
          >
            <div
              class="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ "background-color": getAssetColor(props.ticker) }}
            >
              <span class={sizeConfig().text}>{props.ticker?.slice(0, 2).toUpperCase() || "?"}</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* Actual Image with smooth transition and eager async decoding */}
      <Show when={!hasError() && effectiveLogoUrl()}>
        {(url) => (
          <img
            src={url()}
            alt={props.name || props.ticker}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            class={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              props.imageClass || ""
            } ${isLoaded() ? "opacity-100" : "opacity-0"}`}
            onLoad={() => handleImageLoad(url())}
            onError={handleImageError}
          />
        )}
      </Show>
    </div>
  );
};
