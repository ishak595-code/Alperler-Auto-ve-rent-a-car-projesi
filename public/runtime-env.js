(() => {
  const current = window.process && typeof window.process === "object" ? window.process : {};
  const env = current.env && typeof current.env === "object" ? current.env : {};
  window.process = { ...current, env: { ...env, NODE_ENV: "production" } };
})();
