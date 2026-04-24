import { createClient } from "@nhost/nhost-js";

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN;
const region = process.env.NEXT_PUBLIC_NHOST_REGION;

export const nhost = createClient({
  subdomain: subdomain ?? "your-subdomain",
  region: region ?? "your-region"
});
