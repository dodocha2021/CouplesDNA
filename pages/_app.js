import '../styles/animations.css';
import VersionTag from '../components/VersionTag';

export default function App({ Component, pageProps }) {
  return (
    <>
      <VersionTag />
      <Component {...pageProps} />
    </>
  );
} 