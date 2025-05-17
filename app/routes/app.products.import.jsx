import { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { BackgroundImport } from '../components/BackgroundImport';
import { useToast } from '@chakra-ui/react';

export default function ImportProducts() {
  const [importId, setImportId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleImport = async (formData) => {
    try {
      setIsImporting(true);
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      setImportId(data.importId);
      
      // Show initial toast
      toast({
        title: 'Import Started',
        description: 'Your products are being imported in the background. You can navigate away from this page.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      // Optionally navigate to another page
      // navigate('/app/products');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportComplete = (progress) => {
    // Handle any additional actions after import completes
    console.log('Import completed:', progress);
  };

  return (
    <div>
      {/* Download link for custom CSV sample */}
      <a href="/samples/custom-csv-sample.csv" download >
        Download Custom CSV Sample
      </a>
      {/* Your existing import form UI */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        handleImport(formData);
      }}>
        {/* Your form fields */}
      </form>

      {/* Background import component */}
      {importId && (
        <BackgroundImport 
          importId={importId} 
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
} 