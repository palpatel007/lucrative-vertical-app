import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import {
  Page,
  Text,
  Box,
  Button,
  Card,
  Link,
  BlockStack,
  InlineGrid,
  ButtonGroup,
  Pagination,
  Icon,
  Collapsible,
  Popover,
  ActionList,
  DropZone,
  InlineStack,
  Toast,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Badge,
  DataTable,
  Modal,
  Spinner
} from '@shopify/polaris';
import Footer from '../components/Footer';
import tutorialIcon from '../assets/tutorialIcon.png';
import { PlayIcon, ArrowLeftIcon } from '@shopify/polaris-icons';
import { EmailIcon, ChatIcon, NoteIcon, CheckSmallIcon } from '@shopify/polaris-icons';
import amazonIcon from '../assets/source-icons/amazon.svg';
import walmartIcon from '../assets/source-icons/walmart.svg';
import ebayIcon from '../assets/source-icons/ebay.svg';
import aliexpressIcon from '../assets/source-icons/aliexpres.svg';
import woocommerceIcon from '../assets/source-icons/woo.svg';
import wixIcon from '../assets/source-icons/wix.svg';
import alibabaIcon from '../assets/source-icons/alibaba.svg';
import etsyIcon from '../assets/source-icons/etsy.svg';
import squarespaceIcon from '../assets/source-icons/squarespace.svg';
import bigcommerceIcon from '../assets/source-icons/bigCommerce.svg';
import shopifyIcon from '../assets/source-icons/shopify.png';
import csvIcon from '../assets/source-icons/csv.png';
import FaqSection from '../components/FaqSection';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { json } from '@remix-run/node';
import { connectDatabase } from '../utils/database';
import { Shop } from '../models/Shop';
import { authenticate } from "../shopify.server";

const sourceIcons = {
  shopify: shopifyIcon,
  amazon: amazonIcon,
  walmart: walmartIcon,
  ebay: ebayIcon,
  aliexpress: aliexpressIcon,
  woocommerce: woocommerceIcon,
  wix: wixIcon,
  alibaba: alibabaIcon,
  etsy: etsyIcon,
  squarespace: squarespaceIcon,
  bigcommerce: bigcommerceIcon,
  customcsv: csvIcon,
};

const PAGE_SIZE = 10;

function ImportIssuesModal({ open, onClose, fileName, date, issues, issuesLoading, t }) {
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(issues.length / PAGE_SIZE);
  const paginatedIssues = issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <Box display="flex" alignItems="center">
          <Button plain icon={ArrowLeftIcon} onClick={onClose} />
          <Text variant="headingMd" as="h2" marginInlineStart="200">
            {t('import.issues_for', { fileName })}
          </Text>
        </Box>
      }
      large
    >
      <Modal.Section>
        <Text color="subdued">{date}</Text>
        <Box paddingBlockStart="400" />
        <Badge status="new">{t('import.updated', { count: issues.length })}</Badge>
        <Box paddingBlockStart="400" />
        {issuesLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Spinner accessibilityLabel={t('import.loading_issues')} size="large" />
          </Box>
        ) : (
          <DataTable
            columnContentTypes={['text', 'text']}
            headings={[t('import.product_name'), t('import.details')]}
            rows={paginatedIssues.map(issue => [issue.productName, issue.details])}
          />
        )}
        <Box paddingBlockStart="400" display="flex" justifyContent="center">
          <Pagination
            hasPrevious={page > 1}
            onPrevious={() => setPage(page - 1)}
            hasNext={page < totalPages}
            onNext={() => setPage(page + 1)}
            label={`${page}/${totalPages}`}
          />
        </Box>
      </Modal.Section>
    </Modal>
  );
}

function ImportHistoryTable({ importHistory, onViewIssues, historyLoading, t }) {
  const [page, setPage] = useState(1);
  const paginatedData = importHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasData = importHistory.length > 0;
  const totalPages = Math.ceil(importHistory.length / PAGE_SIZE);
  return (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h2">{t('import.history')}</Text>
      </Box>
      {historyLoading ? (
        <Spinner accessibilityLabel="Loading import history" size="large" />
      ) : hasData ? (
        <DataTable
          columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
          headings={[
            t('import.source'),
            t('import.date'),
            t('import.data_type'),
            t('import.imported'),
            t('import.report'),
            t('import.status')
          ]}
          rows={paginatedData.map((row) => [
            row.fileName,
            new Date(row.date).toLocaleString(),
            row.dataType,
            `${row.importedCount || 0} objects`,
            row.issuesCount > 0 && row.status === 'complete' ? <Link url="#" onClick={e => { e.preventDefault(); onViewIssues(row); }}>View issues</Link> : '',
            row.status === 'pending' || row.status === 'processing' ? <Spinner size="small" /> : <Badge tone={row.status === 'complete' ? 'success' : 'critical'}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</Badge>,
          ])}
        />
      ) : (
        <Box padding="400" display="flex" justifyContent="center">
          <Text color="subdued">No import history found.</Text>
        </Box>
      )}
      <Box padding="400" display="flex" justifyContent="center">
        <Pagination
          hasPrevious={page > 1}
          onPrevious={() => setPage(page - 1)}
          hasNext={page * PAGE_SIZE < importHistory.length}
          onNext={() => setPage(page + 1)}
          label={`${page}/${totalPages}`}
        />
      </Box>
    </Card>
  );
}

function SourceDropdown({ selectedSource, setSelectedSource }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const options = [
    { label: 'Shopify', value: 'shopify' },
    { label: 'Amazon Seller', value: 'amazon' },
    { label: 'Walmart Seller', value: 'walmart' },
    { label: 'Ebay Seller', value: 'ebay' },
    // { label: 'AliExpress', value: 'aliexpress' },
    { label: 'WooCommerce', value: 'woocommerce' },
    { label: 'Wix Seller', value: 'wix' },
    { label: 'Alibaba', value: 'alibaba' },
    { label: 'Etsy', value: 'etsy' },
    { label: 'Squarespace', value: 'squarespace' },
    { label: 'BigCommerce', value: 'bigcommerce' },
    { label: 'Custom CSV', value: 'customcsv' },
  ];
  const selected = options.find(opt => opt.value === selectedSource) || options[0];
  const activator = (
    <Button onClick={toggleActive} disclosure>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
        {sourceIcons[selected.value] ? (
          <img
            src={sourceIcons[selected.value]}
            alt={selected.label}
            style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
          />
        ) : null}
        {selected.label}
      </span>
    </Button>
  );
  return (
    <Popover
      active={active}
      activator={activator}
      autofocusTarget="first-node"
      onClose={toggleActive}
    >
      <ActionList
        actionRole="menuitem"
        items={options.map(opt => ({
          content: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: selectedSource === opt.value ? 700 : 400 }}>
              {sourceIcons[opt.value] ? (
                <img
                  src={sourceIcons[opt.value]}
                  alt={opt.label}
                  style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
                />
              ) : null}
              {opt.label}
            </span>
          ),
          active: selectedSource === opt.value,
          suffix: selectedSource === opt.value ? <Icon source={CheckSmallIcon} /> : undefined,
          onAction: () => {
            setSelectedSource(opt.value);
            setActive(false);
          },
        }))}
      />
    </Popover>
  );
}

function ImportSkeleton() {
  return (
    <SkeletonPage>
      {/* Header Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="large" />
            <SkeletonBodyText lines={2} />
          </div>
        </Card>
      </Box>

      {/* Upload Section Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <div style={{ 
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center'
              }}>
                <SkeletonThumbnail size="large" />
                <Box paddingBlockStart="200">
                  <SkeletonBodyText lines={2} />
                </Box>
              </div>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Platform Selection Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={4}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <SkeletonThumbnail size="medium" />
                      <Box paddingBlockStart="200">
                        <SkeletonBodyText lines={1} />
                      </Box>
                    </div>
                  </Card>
                ))}
              </InlineGrid>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Recent Imports Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <BlockStack gap="200">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px' }}>
                      <InlineStack gap="400" align="space-between">
                        <div style={{ flex: 1 }}>
                          <SkeletonBodyText lines={2} />
                        </div>
                        <SkeletonThumbnail size="small" />
                      </InlineStack>
                    </div>
                  </Card>
                ))}
              </BlockStack>
            </Box>
          </div>
        </Card>
      </Box>
    </SkeletonPage>
  );
}

export async function loader({ request }) {
  await connectDatabase();
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  if (!shopDomain) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }
  let shop;
  try {
    shop = await Shop.findOne({ shop: shopDomain });
    console.log('Loader language:', shop?.language);
  } catch (err) {
    return json({ error: "Failed to fetch shop" }, { status: 500 });
  }
  return json({ language: shop?.language || 'en' });
}

export default function Import() {
  const navigate = useNavigate();
  const loaderData = typeof useLoaderData === 'function' ? useLoaderData() : {};
  const { t } = useTranslation();
  const [i18nReady, setI18nReady] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const sourceOptions = [
    { label: t('import.sourceOptions.shopify', 'Shopify'), value: 'shopify' },
    { label: t('import.sourceOptions.amazon', 'Amazon Seller'), value: 'amazon' },
    { label: t('import.sourceOptions.walmart', 'Walmart Seller'), value: 'walmart' },
    { label: t('import.sourceOptions.ebay', 'Ebay Seller'), value: 'ebay' },
    { label: t('import.sourceOptions.aliexpress', 'AliExpress'), value: 'aliexpress' },
    { label: t('import.sourceOptions.woocommerce', 'WooCommerce'), value: 'woocommerce' },
    { label: t('import.sourceOptions.wix', 'Wix Seller'), value: 'wix' },
    { label: t('import.sourceOptions.alibaba', 'Alibaba'), value: 'alibaba' },
    { label: t('import.sourceOptions.etsy', 'Etsy'), value: 'etsy' },
    { label: t('import.sourceOptions.squarespace', 'Squarespace'), value: 'squarespace' },
    { label: t('import.sourceOptions.bigcommerce', 'BigCommerce'), value: 'bigcommerce' },
    { label: t('import.sourceOptions.customcsv', 'Custom CSV'), value: 'customcsv' },
  ];
  const tutorialsRaw = t('quick_tutorials.tutorials', { returnObjects: true });
  const tutorials = Array.isArray(tutorialsRaw) ? tutorialsRaw : [];
  const faqs = t('faq', { returnObjects: true });
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');
  const [file, setFile] = useState(null);
  const [selectedSource, setSelectedSource] = useState(sourceOptions[0]);
  const [popoverActive, setPopoverActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [tutorialPage, setTutorialPage] = useState(1);
  const TUTORIALS_PER_PAGE = 2;
  const totalPages = Math.ceil(tutorials.length / TUTORIALS_PER_PAGE);
  const pagedTutorials = Array.isArray(tutorials)
    ? tutorials.slice((tutorialPage - 1) * TUTORIALS_PER_PAGE, tutorialPage * TUTORIALS_PER_PAGE)
    : [];
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const [shopDomain, setShopDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  useEffect(() => {
    console.log('Import page loaderData.language:', loaderData.language, 'i18n.language:', i18n.language);
    if (loaderData.language && i18n.language !== loaderData.language) {
      i18n.changeLanguage(loaderData.language)
        .then(() => {
          console.log('i18n language changed to', i18n.language);
          setI18nReady(true);
        })
        .catch((err) => {
          console.error('i18n changeLanguage error:', err);
          setI18nReady(true);
        });
    } else {
      setI18nReady(true);
    }
  }, [loaderData.language]);

  useEffect(() => {
    const getShopDomain = async () => {
      try {
        console.log('[Import] Fetching shop domain...');
        const response = await fetch('/api/shop', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('[Import] Not authenticated, redirecting to auth...');
            const returnTo = `/app/import${window.location.search}`;
            window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          throw new Error('Failed to get shop domain');
        }

        const data = await response.json();
        console.log('[Import] Shop API response:', data);

        if (data.success && data.shop) {
          console.log('[Import] Shop domain loaded:', data.shop);
          setShopDomain(data.shop);
        } else {
          console.error('[Import] No shop domain in response:', data);
          showErrorToast('Unable to get shop information. Please try again.');
        }
      } catch (error) {
        console.error('[Import] Error getting shop domain:', error);
        showErrorToast('Failed to load shop information. Please refresh the page.');
      }
    };

    getShopDomain();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => {
    console.log('[Import] Files dropped:', {
      count: acceptedFiles.length,
      files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    setFiles(acceptedFiles);
  }, []);

  const showSuccessToast = (message) => {
    setToastMessage(message);
    setToastError(false);
    setToastActive(true);
  };

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastError(true);
    setToastActive(true);
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/imports?shop=' + shopDomain);
      const data = await res.json();
      setImportHistory(data);
    } catch (err) {
      setImportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [shopDomain]);

  useEffect(() => {
    if (shopDomain) fetchHistory();
  }, [shopDomain, fetchHistory]);

  const handleViewIssues = useCallback(async (importRow) => {
    setSelectedImport(importRow);
    setIssuesLoading(true);
    setModalOpen(true);
    try {
      const res = await fetch(`/api/imports/${importRow._id}/issues`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      setIssues(data);
    } catch (err) {
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  const handleImportClick = async () => {
    if (!shopDomain) {
      showErrorToast('Please wait while we load your shop information...');
      return;
    }
    if (files.length === 0) {
      showErrorToast('Please select a file to import');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    showSuccessToast('Your import is running in the background. You do not need to stay on this page.');
    let importRecord = null;
    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shopDomain,
          source: selectedSource.value,
          fileName: files[0].name,
          dataType: 'Products',
          status: 'pending',
        }),
      });
      importRecord = await res.json();
      setImportHistory((prev) => [importRecord, ...prev]);
    } catch (err) {
      showErrorToast('Failed to create import history.');
      setImportLoading(false);
      return;
    }
    let importSuccess = false;
    let importedCount = 0;
    let issuesCount = 0;
    try {
    const formData = new FormData();
    formData.append('csv', files[0]);
    formData.append('format', selectedSource.value);
    formData.append('shop', shopDomain);
    formData.append('importId', importRecord._id);
      const response = await fetch('/api/csv-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        importSuccess = true;
        importedCount = result.results?.successful || 0;
        issuesCount = (result.results?.failed || 0) + (result.results?.skipped || 0);
        showSuccessToast(`Successfully imported ${importedCount} products!`);
        setImportResult({
          success: true,
          message: `Imported ${importedCount} products!`,
          details: result.results
        });
      } else {
        showErrorToast(result.error || 'Import failed.');
        setImportResult({
          success: false,
          message: result.error || 'Import failed.',
          details: result.results
        });
      }
    } catch (error) {
      showErrorToast(error.message || 'Failed to import products. Please try again.');
      setImportResult({
        success: false,
        message: error.message || 'Failed to import products. Please try again.',
        error: error
      });
    }
    try {
      await fetch(`/api/imports/${importRecord._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: importSuccess ? 'complete' : 'failed',
          importedCount,
          issuesCount
        }),
      });
      fetchHistory();
    } catch (err) {
      await fetch(`/api/imports/${importRecord._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed' }),
      });
      fetchHistory();
    }
    setImportLoading(false);
  };

  if (!i18nReady) {
    return <ImportSkeleton />;
  }

  return (
    <Frame>
      <Page>
        
        {selectedImport && (
          <ImportIssuesModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            fileName={selectedImport.source}
            date={selectedImport.date}
            issues={issues}
            issuesLoading={issuesLoading}
            t={t}
          />
        )}
        <Box paddingBlockStart="400" paddingBlockEnd="400" display="flex" justifyContent="center">
          <Card>
            <Box padding="600" minWidth="920px" maxWidth="700px">
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box width="100%" display="flex" flexDirection="column" alignItems="center">
                  <Text variant="bodyMd" as="div" fontWeight="medium" alignment="center" >
                    {t('import.select_source_file')}
                  </Text>
                  <div align="center">
                    <SourceDropdown selectedSource={selectedSource.value} setSelectedSource={val => setSelectedSource(sourceOptions.find(opt => opt.value === val))} />
                  </div>
                </Box>
              </Box>
              <Box paddingBlockStart="400" />
              <Text variant="bodyMd" fontWeight="medium" paddingBlockEnd="200">
                {t('import.import_products_by_csv')}
              </Text>
              <DropZone
                onDrop={handleDropZoneDrop}
                accept=".csv"
                type="file"
              >
                <DropZone.FileUpload actionTitle={t('import.add_files')} actionHint={t('import.accepts_csv')} />
                {files.length > 0 && (
                  <Box paddingBlockStart="200">
                    <Text variant="bodySm">{files.map(file => file.name).join(', ')}</Text>
                  </Box>
                )}
              </DropZone>
              <Box paddingBlockStart="400" />
              <InlineStack align="fill" gap="200" blockAlign="center">
                {selectedSource.value === 'customcsv' ? (
                  <>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <a
                        href="/api/products/export?format=customcsv&type=sample"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'underline', color: '#3574F2' }}
                      >
                        {t('import.download_sample_csv')}
                      </a>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setFiles([])} disabled={importLoading}>{t('import.cancel')}</Button>
                      <Button variant="primary" loading={importLoading} onClick={handleImportClick}>{t('import.start_import')}</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setFiles([])} disabled={importLoading}>{t('import.cancel')}</Button>
                      <Button variant="primary" loading={importLoading} onClick={handleImportClick}>{t('import.start_import')}</Button>
                    </div>
                  </>
                )}
              </InlineStack>
            </Box>
          </Card>
        </Box>
        <ImportHistoryTable importHistory={importHistory} onViewIssues={handleViewIssues} historyLoading={historyLoading} t={t} />
        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400" paddingBlockStart="400">
          <Card padding="500" background="bg-surface" borderRadius="2xl" paddingBlockStart="600" paddingBlockEnd="600">
            <BlockStack gap="200">
              <Text variant="headingMd">{t('import.quick_tutorials')}</Text>
              <Text color="subdued">{t('import.quick_tutorials_subheading')}</Text>
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                {Array.isArray(pagedTutorials) && pagedTutorials.map((tut, idx) => (
                  <Card key={idx} padding="400">
                    <Box background="bg-surface">
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Box
                          width="60px"
                          height="60px"
                          borderRadius="full"
                          background="#8B5CF6"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          marginInlineEnd="200"
                        >
                          <img src={tutorialIcon} alt="Tutorial" style={{ width: 40, height: 40 }} />
                        </Box>
                        <BlockStack gap="100">
                          <Text variant="headingSm">{tut.title}</Text>
                          <Text>{tut.description}</Text>
                          <ButtonGroup>
                            <Button
                              onClick={() => window.open(tut.video, '_blank')}
                              variant="primary"
                              size="slim"
                            >
                              {t('import.watch_video')}
                            </Button>
                            <Button
                              onClick={() => window.open(tut.instruction, '_blank')}
                              variant="secondary"
                              size="slim"
                            >
                              {t('import.read_instruction')}
                            </Button>
                          </ButtonGroup>
                        </BlockStack>
                      </div>
                    </Box>
                  </Card>
                ))}
              </InlineGrid>
              <Box display="flex" alignItems="center" justifyContent="space-between" marginBlockStart="4">
                <Pagination
                  hasPrevious={tutorialPage > 1}
                  onPrevious={() => setTutorialPage(tutorialPage - 1)}
                  hasNext={tutorialPage < totalPages}
                  onNext={() => setTutorialPage(tutorialPage + 1)}
                  label={`${tutorialPage}/${totalPages}`}
                />
              </Box>
            </BlockStack>
          </Card>
        </Box>

        <Box display="flex" justifyContent="flex-start" paddingBlockEnd="400">
          <Card paddingBlockStart="600" paddingBlockEnd="600" background="bg-surface" borderRadius="2xl">
            <div style={{ padding: '5px 0px 11px 2px' }}>
              <Text variant="headingMd" as="h2" fontWeight="bold">
                {t('import.need_help_or_import')}
              </Text>
            </div>
            <InlineGrid columns={3} gap="400" style={{ width: '100%' }}>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }} onClick={e => { e.preventDefault(); navigate('/app/contact#help-section'); }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={EmailIcon} color="interactive" />
                      {t('import.get_email_support')}
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    {t('import.email_support_description')}
                  </Text>
                </Box>
              </Card>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }} onClick={e => { e.preventDefault(); if (window.$crisp) window.$crisp.push(["do", "chat:open"]); }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={ChatIcon} color="interactive" />
                      {t('import.start_live_chat')}
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    {t('import.live_chat_description')}
                  </Text>
                </Box>
              </Card>
              <Card padding="400" border="base" background="bg-surface" borderRadius="lg" style={{ width: '100%', margin: 0 }}>
                <Box marginInlineStart="200">
                  <Link url="#" monochrome={false} style={{ color: '#3574F2', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon source={NoteIcon} color="interactive" />
                      {t('import.help_docs')}
                    </span>
                  </Link>
                  <Text color="subdued" fontSize="bodySm">
                    {t('import.help_docs_description')}
                  </Text>
                </Box>
              </Card>
            </InlineGrid>
            <Box display="flex" paddingBlockStart="400" >
              <FaqSection />
            </Box>
          </Card>
        </Box>
        
        {toastActive && (
          <Toast content={toastMessage} error={toastError} onDismiss={() => setToastActive(false)} />
        )}

        <Footer />
      </Page>
    </Frame>
  );
} 
