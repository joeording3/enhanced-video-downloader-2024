// @ts-nocheck
module.exports = function (api) {
  const presets = [["@babel/preset-env", { targets: { node: "current" } }]];
  const plugins = api.env("coverage") ? ["istanbul"] : [];
  return { presets, plugins };
};
