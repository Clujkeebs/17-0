import next from 'eslint-config-next';

const config = [
  ...next,
  { ignores: ['.next/**', 'dist/**', 'node_modules/**', 'coverage/**', 'drizzle/**', 'next-env.d.ts'] },
  { rules: { '@next/next/no-img-element': 'off', 'react-hooks/set-state-in-effect': 'off', 'react-hooks/refs': 'off' } },
];
export default config;
