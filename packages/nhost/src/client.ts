import { createClient } from "@nhost/nhost-js";

type NhostEnv = {
  NHOST_SUBDOMAIN?: string;
  NHOST_REGION?: string;
  YURBRAIN_NHOST_SUBDOMAIN?: string;
  YURBRAIN_NHOST_REGION?: string;
};

function resolveEnv(): NhostEnv {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as NhostEnv;
}

function resolveConfig() {
  const env = resolveEnv();
  const subdomain = env.NHOST_SUBDOMAIN ?? env.YURBRAIN_NHOST_SUBDOMAIN;
  const region = env.NHOST_REGION ?? env.YURBRAIN_NHOST_REGION;

  return {
    subdomain: subdomain ?? "your-subdomain",
    region: region ?? "your-region"
  };
}

export const nhost = createClient(resolveConfig());
