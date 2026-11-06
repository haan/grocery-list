module.exports = function (api) {
  api.cache(true);
  // Explicit for the Android Jest preset as well as Metro.
  return { presets: ['babel-preset-expo'] };
};
