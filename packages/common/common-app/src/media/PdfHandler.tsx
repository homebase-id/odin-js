import React, { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

interface PDFHandlerProps {
  fetchFile: () => Promise<string>;
  className?: string;
  fileName?: string;
  forceExternal?: boolean;
}

export const PDFHandler: React.FC<PDFHandlerProps> = ({
  fetchFile,
  className = '',
  fileName,
  forceExternal = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string>('');

  // Platform detection
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Resolve the file URL via the provided fetcher
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = await fetchFile();
        const withFitToWidth = (u: string) => {
          if (!u) return u;
          // If URL already has a hash fragment, don't override consumer-provided params
          if (u.includes('#')) return u;
          // Hint most PDF viewers (Chrome, Safari PDF.js, Firefox) to fit width
          return `${u}#page=1&zoom=page-width`;
        };
        if (mounted) setDisplayUrl(withFitToWidth(url || ''));
      } catch {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchFile]);

  const openExternally = useCallback((url: string) => {
    if (!url) return;

    // React Native WebView bridge support
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openExternal', url }));
      return;
    }

    // Browser fallback
    const win = window.open(url, '_blank');
    if (!win) alert('Could not open PDF externally. Please allow popups.');
  }, []);

  // iOS and browsers can render PDFs natively; Android WebView cannot.
  const shouldUseIframe = !forceExternal && (!isAndroid || isIOS);

  // Fallback logic if PDF fails to load
  useEffect(() => {
    if (!displayUrl) return;

    if (!shouldUseIframe) {
      setFailed(true);
      openExternally(displayUrl);
      return;
    }

    const timeout = setTimeout(() => {
      if (!loaded) {
        setFailed(true);
        openExternally(displayUrl);
      }
    }, 3500);

    return () => clearTimeout(timeout);
  }, [displayUrl, shouldUseIframe, loaded, openExternally]);

  return (
    <div className={`w-full h-full relative ${className}`}>
      {!failed && shouldUseIframe ? (
        <iframe
          ref={iframeRef}
          src={displayUrl}
          title={fileName || 'PDF Viewer'}
          className="w-full h-full min-h-[100dvh] border-none bg-gray-50"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <p className="mb-4 text-gray-700">Unable to render PDF inside this view.</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
            onClick={() => openExternally(displayUrl)}
          >
            Open PDF Externally
          </button>
        </div>
      )}
    </div>
  );
};
