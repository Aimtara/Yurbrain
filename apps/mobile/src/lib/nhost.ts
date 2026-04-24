import { createClient } from "@nhost/nhost-js";

const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN;
const region = process.env.EXPO_PUBLIC_NHOST_REGION;

export const nhost = createClient({
  subdomain: subdomain ?? "your-subdomain",
  region: region ?? "your-region"
});
