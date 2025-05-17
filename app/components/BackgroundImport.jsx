import { useEffect, useState } from 'react';
import { Banner } from '@shopify/polaris';

function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
}

function BackgroundImportClient({ importId, onComplete }) {
  const [isPolling, setIsPolling] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!importId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/products/import/background?importId=${importId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        const { progress } = data;

        if (progress.status === 'completed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          setToast({
            status: 'success',
            title: 'Import Completed',
            content: `Successfully imported ${progress.successful} products. ${progress.failed} failed.`
          });

          if (onComplete) {
            onComplete(progress);
          }
        } else if (progress.status === 'failed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          setToast({
            status: 'critical',
            title: 'Import Failed',
            content: progress.error || 'An error occurred during import'
          });

          if (onComplete) {
            onComplete(progress);
          }
        }
      } catch (error) {
        console.error('Error polling import status:', error);
        setToast({
          status: 'critical',
          title: 'Error',
          content: 'Failed to check import status'
        });
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [importId, onComplete]);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return toast ? (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
      <Banner
        status={toast.status}
        title={toast.title}
        onDismiss={() => setToast(null)}
      >
        <p>{toast.content}</p>
      </Banner>
    </div>
  ) : null;
}

export function BackgroundImport(props) {
  const isClient = useIsClient();
  
  if (!isClient) {
    return null;
  }

  return <BackgroundImportClient {...props} />;
} 