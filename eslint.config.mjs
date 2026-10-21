import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".venv/**",
      "venv/**",
      "node_modules/**",
      "backend/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
);
