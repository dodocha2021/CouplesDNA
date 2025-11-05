
import { useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Toaster } from "@/components/ui/toaster";
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import Head from 'next/head';
import VersionTag from '@/components/VersionTag';
import '../styles/globals.css'; // Corrected path

function App({ Component, pageProps }) {
  // Create a new supabase browser client on every first render.
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Head>
        <title>CouplesDNA</title>
        <meta name="description" content="Understand your relationship better." />
        {/* Add other global meta tags here */}
      </Head>
      <Component {...pageProps} />
      <Toaster />
      <ProgressBar
        height="4px"
        color="#ff595e"
        options={{ showSpinner: false }}
        shallowRouting
      />
      <VersionTag />
    </SessionContextProvider>
  );
}

export default App;
