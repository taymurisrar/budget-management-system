function normalizeEnvironment(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function getAppEnvironment() {
  const appEnv = normalizeEnvironment(process.env.APP_ENV);
  if (appEnv) {
    return appEnv;
  }

  const nodeEnv = normalizeEnvironment(process.env.NODE_ENV);
  return nodeEnv || "development";
}

export function isProductionEnvironment() {
  return getAppEnvironment() === "production";
}

export function isDevelopmentEnvironment() {
  return getAppEnvironment() === "development";
}
