import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".venv/**",
      "venv/**",
      "node_modules/**",
      "out/**",
      "public/divine-office/**",
      "backend/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
);
