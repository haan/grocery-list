// Default to Dev for Metro/local development. EAS profiles select explicitly.
module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || 'development';
  if (!['development', 'production'].includes(variant)) {
    throw new Error(`Unknown APP_VARIANT: ${variant}`);
  }
  if (process.env.EAS_BUILD_PROFILE && process.env.EAS_BUILD_PROFILE !== variant) {
    throw new Error('EAS_BUILD_PROFILE and APP_VARIANT must match');
  }
  const dev = variant === 'development';
  const backgroundColor = dev ? '#5B3A80' : '#05515F';
  return {
    ...config,
    name: dev ? 'Grocery List Dev' : 'Grocery List',
    scheme: dev ? 'haan-grocerylist-dev' : 'haan-grocerylist',
    android: {
      ...config.android,
      package: dev ? 'io.github.haan.grocerylist.dev' : 'io.github.haan.grocerylist',
      adaptiveIcon: { ...config.android.adaptiveIcon, backgroundColor },
    },
    plugins: [
      ...config.plugins.map(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
        ? [plugin[0], { ...plugin[1], backgroundColor }] : plugin),
      // Do not let both binaries register the shared exp+grocery-list scheme.
      ['expo-dev-client', { addGeneratedScheme: false }],
    ],
    extra: { ...config.extra, appVariant: variant },
  };
};
