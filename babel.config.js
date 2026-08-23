module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required by react-native-reanimated 4 / react-native-worklets.
      // Must stay last in this list.
      'react-native-worklets/plugin',
    ],
  };
};
