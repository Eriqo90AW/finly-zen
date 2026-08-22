import { ParentProps, Show, onMount } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "../../context/authContext";

export const ProtectedRoute = (props: ParentProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  onMount(() => {
    if (!isLoading() && !isAuthenticated()) {
      navigate(`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      });
    }
  });

  return (
    <Show
      when={!isLoading()}
      fallback={
        <div class="min-h-screen bg-page-bg flex items-center justify-center">
          <div class="flex flex-col items-center gap-3">
            <div class="w-10 h-10 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
            <span class="text-xs font-outfit text-forest/70 font-medium">Verifying session...</span>
          </div>
        </div>
      }
    >
      <Show
        when={isAuthenticated()}
        fallback={
          <div class="min-h-screen bg-page-bg flex items-center justify-center">
            <div class="w-8 h-8 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
          </div>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
};

export default ProtectedRoute;
