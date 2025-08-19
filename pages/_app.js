import '../styles/globals.css';
import VersionTag from '../components/VersionTag';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 只在开发模式下初始化21st.dev toolbar
    if (process.env.NODE_ENV === 'development') {
      const initToolbar = async () => {
        try {
          const { initToolbar } = await import('@21st-extension/toolbar');
          const stagewiseConfig = {
            plugins: [],
          };
          initToolbar(stagewiseConfig);
        } catch (error) {
          console.warn('21st.dev toolbar initialization failed:', error);
        }
      };
      
      initToolbar();
    }
  }, []);

  return (
    <>
      <VersionTag />
      <Component {...pageProps} />
    </>
  );
} 