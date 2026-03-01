import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const config = [
  // Next.js recommended rules (React, React Hooks, @next/next, jsx-a11y, import)
  ...nextConfig,
  // Disable ESLint formatting rules that conflict with Prettier
  prettierConfig,
  {
    rules: {
      // Flag unused variables; allow leading-underscore names
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Permit console.error; warn on everything else
      "no-console": ["warn", { allow: ["error"] }],
      // Downgrade exhaustive-deps to warning — some intentional dep omissions exist
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Relax rules in test files
    files: ["**/__tests__/**/*.js"],
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
    },
  },
];

export default config;
