import { A } from "@solidjs/router";

interface AuthEditorialPanelProps {
  eyebrow: string;
  quote: string;
  description: string;
}

export const AuthEditorialPanel = (props: AuthEditorialPanelProps) => {
  return (
    <div class="hidden md:flex md:w-5/12 lg:w-1/2 bg-forest text-white p-8 lg:p-16 flex-col justify-between relative overflow-hidden">
      <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div class="absolute right-10 top-10 w-40 h-40 rounded-full bg-spring/10 pointer-events-none" />

      <div class="relative z-10">
        <A href="/" class="flex items-center gap-3 text-white group">
          <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <span class="material-icons text-2xl text-spring">eco</span>
          </div>
          <span class="text-2xl font-cormorant font-bold tracking-tight">
            Finly Zen
          </span>
        </A>
      </div>

      <div class="relative z-10 my-auto py-12">
        <span class="text-[10px] font-bold text-spring uppercase tracking-widest block mb-4">
          {props.eyebrow}
        </span>
        <h2 class="text-3xl lg:text-4xl font-cormorant font-bold leading-tight mb-6">
          {props.quote}
        </h2>
        <p class="text-xs text-white/70 font-outfit max-w-md leading-relaxed">
          {props.description}
        </p>
      </div>

      <div class="relative z-10 text-xs text-white/50">
        Finly Zen • Light-Mode Financial Architecture
      </div>
    </div>
  );
};

interface GoogleComingSoonButtonProps {
  label: string;
}

export const GoogleComingSoonButton = (props: GoogleComingSoonButtonProps) => {
  return (
    <div class="relative mb-6">
      <button
        type="button"
        disabled={true}
        class="w-full flex items-center justify-center gap-3 bg-sage/30 border border-forest/10 text-forest/40 font-outfit font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-none cursor-not-allowed opacity-75"
      >
        <svg class="w-4 h-4 opacity-50 grayscale" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{props.label}</span>
      </button>
      <span class="absolute -top-2.5 right-3 bg-ochre-dark text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
        Coming Soon
      </span>
    </div>
  );
};
