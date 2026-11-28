import { useNavigate } from "@solidjs/router";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { useAuth } from "../../context/authContext";
import { resetAppState, state } from "../../store";
import { resetPortfolioState } from "../../store/portfolioStore";

const TopBarProfileMenu = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = createSignal(false);

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".profile-menu-container")) {
      setIsProfileMenuOpen(false);
    }
  };

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("click", handleClickOutside);
  });

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    await signOut();
    resetAppState();
    resetPortfolioState();
    navigate("/", { replace: true });
  };

  const userDisplayName = () => {
    const u = user();
    return (
      u?.user_metadata?.full_name ||
      u?.user_metadata?.name ||
      state.settings.userName ||
      (u?.email ? u.email.split("@")[0] : "Master Gardener")
    );
  };

  const userAvatarUrl = () => {
    const u = user();
    if (u?.user_metadata?.avatar_url) return u.user_metadata.avatar_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName())}&background=1A4D2E&color=fff`;
  };

  return (
    <div class="relative profile-menu-container pl-2 sm:pl-4 border-l border-forest/10">
      <button
        type="button"
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen())}
        class="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity cursor-pointer group text-left"
        aria-label="User profile menu"
      >
        <div class="text-right hidden sm:block">
          <p class="text-xs sm:text-sm font-outfit font-semibold text-forest line-clamp-1 max-w-[120px] sm:max-w-[140px]">
            {userDisplayName()}
          </p>
          <p class="text-[9px] sm:text-[10px] text-earth uppercase tracking-widest">
            Master Gardener
          </p>
        </div>
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-forest/10 flex items-center justify-center overflow-hidden border border-forest/10 shadow-sm group-hover:ring-2 group-hover:ring-forest/20 transition-all">
          <img src={userAvatarUrl()} alt="Avatar" class="w-full h-full object-cover" />
        </div>
      </button>

      {/* Profile Dropdown Menu */}
      <Show when={isProfileMenuOpen()}>
        <div class="absolute right-0 top-[calc(100%+8px)] sm:top-[calc(100%+12px)] w-60 sm:w-64 bg-white border border-forest/10 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 animate-slide-down">
          {/* User Details Header */}
          <div class="p-3 border-b border-forest/10">
            <p class="text-xs font-bold text-forest font-outfit truncate">
              {userDisplayName()}
            </p>
            <p class="text-[11px] text-earth font-outfit truncate">
              {user()?.email || "No email"}
            </p>
            <div class="mt-2 flex items-center gap-1.5">
              <span class="bg-sage text-forest text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {user()?.app_metadata?.provider === "google" ? "Google Account" : "Email Auth"}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <button
            type="button"
            onClick={handleSignOut}
            class="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-terracotta hover:bg-terracotta/10 rounded-xl transition-colors text-left cursor-pointer"
          >
            <span class="material-icons text-base">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default TopBarProfileMenu;
