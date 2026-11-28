/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies complicate bundling and reactivity.",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-supabase-in-ui",
      severity: "error",
      comment:
        "UI components, pages, and feature UI modules must go through src/data/ or feature data repositories instead of importing the Supabase client directly.",
      from: {
        path: "^src/(components|pages|features)/",
        pathNot: "^src/features/[^/]+/data/",
      },
      to: {
        path: "^src/lib/supabase\\.ts$",
      },
    },
    {
      name: "shared-isolated",
      severity: "error",
      comment:
        "Shared utilities, types, and config must remain independent of UI components, pages, stores, and feature slices.",
      from: {
        path: "^src/(utils|types|config|shared)/",
      },
      to: {
        path: "^src/(components|pages|store|features)/",
      },
    },
    {
      name: "feature-public-api",
      severity: "error",
      comment:
        "Cross-feature and external imports into a feature slice must go through that feature's index.ts barrel.",
      from: {
        path: "^src/features/([^/]+)/",
      },
      to: {
        path: "^src/features/([^/]+)/.+",
        pathNot: ["^src/features/$1/", "^src/features/[^/]+/index\\.(ts|tsx)$"],
      },
    },
    {
      name: "no-deep-feature-imports-from-outside",
      severity: "error",
      comment:
        "Code outside src/features/ must import feature slices only via src/features/<domain>/index.ts.",
      from: {
        pathNot: "^src/features/",
      },
      to: {
        path: "^src/features/[^/]+/.+",
        pathNot: "^src/features/[^/]+/index\\.(ts|tsx)$",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
