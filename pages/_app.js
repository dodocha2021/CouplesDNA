import '../styles/animations.css';

const commitHash =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  '';

export default function App({ Component, pageProps }) {
  return (
    <>
      {commitHash && (
        <div style={{
          position: 'fixed',
          top: 8,
          left: 8,
          fontSize: 12,
          color: '#888',
          background: '#fff8',
          borderRadius: 4,
          padding: '2px 8px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          v{commitHash.slice(0, 7)}
        </div>
      )}
      <Component {...pageProps} />
    </>
  );
} 