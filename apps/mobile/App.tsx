import { NhostProvider, NhostClient } from '@nhost/react';

const nhost = new NhostClient({
  authUrl: process.env.EXPO_PUBLIC_NHOST_AUTH_URL,
  graphqlUrl: process.env.EXPO_PUBLIC_NHOST_GRAPHQL_URL,
  functionsUrl: process.env.EXPO_PUBLIC_NHOST_FUNCTIONS_URL
});

export default function App() {
  return (
    <NhostProvider nhost={nhost}>
       {./src/App}
    </NhostProvider>
  );
}

export { default } from "./src/App";
