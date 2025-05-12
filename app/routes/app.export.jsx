import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Text,
  Button,
  Card,
  Select,
  Link,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Layout,
  Checkbox,
  DataTable,
  TextField,
  Tabs,
  Modal,
  Spinner,
  Thumbnail,
  Icon,
  ActionMenu,
  Pagination,
  Popover,
  IndexTable,
  LegacyCard,
  useIndexResourceState,
  useBreakpoints,
  IndexFilters,
  useSetIndexFiltersMode,
  ChoiceList,
  Toast,
  Frame,
} from '@shopify/polaris';
import '../styles/globals.css';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

// Placeholder SVG icon for download
const DownloadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#7B3FF2"/>
    <path d="M24 14V34m0 0l-6-6m6 6l6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const formatOptions = [
  { label: 'CSV', value: 'csv' },
  { label: 'Excel (XLSX)', value: 'xlsx' },
  { label: 'JSON', value: 'json' },
];

const tabs = [
  { id: 'all', content: 'All' },
  { id: 'active', content: 'Active' },
  { id: 'draft', content: 'Draft' },
  { id: 'archived', content: 'Archived' },
  
];

const exportFormats = [
  { label: 'Custom CSV', value: 'customcsv' },
  { label: 'Shopify CSV', value: 'shopify' },
  { label: 'WooCommerce CSV', value: 'woocommerce' },
];

const PAGE_SIZE = 50;

function statusBadgeColor(status) {
  if (!status) return { status: 'default', tone: 'default' };
  
  const statusStr = String(status).toLowerCase();
  switch (statusStr) {
    case 'active': return { status: 'success', tone: 'success' };
    case 'draft': return { status: 'info', tone: 'info' };
    case 'archived': return { status: 'default', tone: 'default' };
    default: return { status: 'default', tone: 'default' };
  }
}

function StatusBadge({ status }) {
  const { status: badgeStatus, tone } = statusBadgeColor(status);
  return <Badge status={badgeStatus} tone={tone}>{status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown'}</Badge>;
}

export default function ExportPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [exportFormat, setExportFormat] = useState('customcsv');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [popoverActive, setPopoverActive] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [queryValue, setQueryValue] = useState('');
  const [sortSelected, setSortSelected] = useState(['created desc']);
  const {mode, setMode} = useSetIndexFiltersMode();
  const [vendorFilter, setVendorFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [views, setViews] = useState([]);
  const [selectedView, setSelectedView] = useState(0);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortColumn, setSortColumn] = useState('title');
  const breakpoints = useBreakpoints();
  const [isExporting, setIsExporting] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const navigate = useNavigate();

  const sortOptions = [
    { label: 'Product title', value: 'title', directionLabel: 'A-Z' },
    { label: 'Created', value: 'created', directionLabel: 'Newest first' },
    { label: 'Updated', value: 'updated', directionLabel: 'Newest first' },
    { label: 'Inventory', value: 'inventory', directionLabel: 'Highest first' },
    { label: 'Product type', value: 'type', directionLabel: 'A-Z' },
    { label: 'Publishing error', value: 'publishingError', directionLabel: '' },
    { label: 'Vendor', value: 'vendor', directionLabel: 'A-Z' },
  ];

  const vendorOptions = useMemo(() => {
    const uniqueVendors = Array.from(new Set(products.map(p => p.vendor).filter(Boolean)));
    return uniqueVendors.map(vendor => ({ label: vendor, value: vendor }));
  }, [products]);

  const tagOptions = useMemo(() => {
    // Assuming each product has a tags array (adjust if your data structure is different)
    const allTags = products.flatMap(p => p.tags || []);
    const uniqueTags = Array.from(new Set(allTags));
    return uniqueTags.map(tag => ({ label: tag, value: tag }));
  }, [products]);

  const statusOptions = [
    {label: 'Active', value: 'active'},
    {label: 'Draft', value: 'draft'},
    {label: 'Archived', value: 'archived'},
  ];

  const filters = [
    {
      key: 'vendor',
      label: 'Vendors',
      filter: (
        <ChoiceList
          title="Vendors"
          choices={vendorOptions}
          selected={vendorFilter}
          onChange={setVendorFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'tag',
      label: 'Tag',
      filter: (
        <ChoiceList
          title="Tag"
          choices={tagOptions}
          selected={tagFilter}
          onChange={setTagFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'status',
      label: 'Statuses',
      filter: (
        <ChoiceList
          title="Statuses"
          choices={statusOptions}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const handleFiltersClearAll = () => {
    setVendorFilter([]);
    setTagFilter([]);
    setStatusFilter([]);
  };

  const fetchProducts = async (cursor = null, currentPage = 1) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      let url = `/api/products?limit=${PAGE_SIZE}&page=${currentPage}`;
      if (searchValue && searchValue.trim() !== '') {
        url += `&search=${encodeURIComponent(searchValue)}`;
      }
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      console.log('Fetching products with URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please check your authentication.');
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (data.upgradeUrl) {
          handleCloseExportModal();
          alert(data.error || "You have reached your export limit. Please upgrade your plan.");
          navigate('/app/billing');
          return;
        }
        // If error is 401, redirect to login
        if (response.status === 401) {
          const shop = new URLSearchParams(window.location.search).get('shop');
          const returnTo = `/app/export${shop ? `?shop=${shop}` : ''}`;
          window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }
        throw new Error(data.error || 'Failed to fetch products');
      }

      if (data.success) {
        setProducts(data.products);
        setHasNextPage(!!data.pagination?.hasNextPage);
        if (data.pagination?.endCursor) {
          setEndCursor(data.pagination.endCursor);
        }
        setPage(currentPage);
      } else {
        throw new Error(data.error || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error:', error);
      setAuthError(error.message);
      // If it's an authentication error, redirect to auth
      if (error.message.includes('authentication')) {
        const shop = new URLSearchParams(window.location.search).get('shop');
        const returnTo = `/app/export${shop ? `?shop=${shop}` : ''}`;
        window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProducts(null, 1);
  }, [searchValue]);

  const handleSearch = (value) => {
    setIsLoading(true);
    setSearchValue(value);
    setPage(1);
    setCursorStack([]);
    setEndCursor(null);
  };

  const handleNext = useCallback(() => {
    if (hasNextPage && endCursor) {
      const nextPage = page + 1;
      setCursorStack(prev => [...prev, endCursor]);
      fetchProducts(endCursor, nextPage);
    }
  }, [hasNextPage, endCursor, page, fetchProducts]);

  const handlePrevious = useCallback(() => {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      const previousCursor = newStack.pop();
      setCursorStack(newStack);
      const prevPage = page - 1;
      fetchProducts(previousCursor, prevPage);
    }
  }, [cursorStack, page, fetchProducts]);

  const handleRefresh = () => {
    setCursorStack([]);
    setEndCursor(null);
    fetchProducts(null, 1);
  };

  const handleOpenExportModal = (type) => {
    setExportType(type);
    setExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    setExportModalOpen(false);
  };

  // Filter products based on selected tab
  const filteredProducts = products
    .filter(product => {
      if (selectedTab === 0) return true;
      const statusMap = ['all', 'active', 'draft', 'archived', 'more'];
      return product.status && product.status.toLowerCase() === statusMap[selectedTab];
    })
    .filter(product => product.title.toLowerCase().includes(searchValue.toLowerCase()))
    .filter(product => !vendorFilter.length || vendorFilter.includes(product.vendor))
    .filter(product => !tagFilter.length || (product.tags && product.tags.some(tag => tagFilter.includes(tag))))
    .filter(product => !statusFilter.length || statusFilter.includes(product.status?.toLowerCase()));

  // Use selectedResources from Polaris IndexTable
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(filteredProducts);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      console.log('[Export][Frontend] Starting export with type:', exportType, 'selectedResources:', selectedResources, 'exportFormat:', exportFormat);
      const url = `/api/products/export?type=${exportType}&format=${exportFormat}`;
      console.log('[Export][Frontend] URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedResources }),
        credentials: 'include',
      });

      console.log('[Export][Frontend] Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.log('[Export][Frontend] Error response:', data);
        if (data.upgradeUrl) {
          console.log('[Export][Frontend] upgradeUrl:', data.upgradeUrl);
          showErrorToast(data.error || "You have reached your export limit. Please upgrade your plan.");
          navigate('/app/billing');
          return;
        }
        if (response.status === 401) {
          const shop = new URLSearchParams(window.location.search).get('shop');
          const returnTo = `/app/export${shop ? `?shop=${shop}` : ''}`;
          window.location.href = `/auth?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }
        showErrorToast(data.error || 'Export failed');
        throw new Error(data.error || 'Export failed');
      }

      // Handle successful response (file download)
      let filename = `products-${exportFormat}.csv`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      const blob = await response.blob();
      console.log('[Export][Frontend] Blob created:', blob);

      const downloadUrl = window.URL.createObjectURL(blob);
      console.log('[Export][Frontend] Download URL created:', downloadUrl);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      console.log('[Export][Frontend] Anchor element created and appended. Triggering click...');
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      console.log('[Export][Frontend] Download triggered and URL revoked.');
      showSuccessToast('Export successful!');
    } catch (error) {
      console.error('[Export][Frontend] Fetch or code error:', error);
      if (error.message.includes('Export limit exceeded')) {
        const shopId = new URLSearchParams(window.location.search).get('shop');
        if (shopId) {
          showErrorToast('Export limit exceeded. Please upgrade your plan.');
          navigate('/app/billing');
          return;
        }
      }
      showErrorToast(error.message || 'Failed to export products. Please try again.');
    } finally {
      setIsExporting(false);
      handleCloseExportModal();
    }
  };

  // Debug logging
  console.log('Products:', products);
  console.log('Filtered Products:', filteredProducts);
  console.log('Selected Tab:', selectedTab);

  // Export format options for CustomDropdown
  const exportFormatOptions = [
    { value: 'customcsv', label: 'Custom CSV' },
    { value: 'shopify', label: 'Shopify CSV' },
    { value: 'woocommerce', label: 'WooCommerce CSV' },
  ];

  // Add error display to the UI
  const renderError = () => {
    if (!authError) return null;
    return (
      <div style={{ 
        padding: '16px', 
        margin: '16px', 
        backgroundColor: '#FBE9E7', 
        border: '1px solid #FFCDD2', 
        borderRadius: '4px',
        color: '#D32F2F',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{authError}</span>
        <Button onClick={handleRefresh} size="slim">
          Refresh
        </Button>
      </div>
    );
  };

  // Add debug logging for selected products
  useEffect(() => {
    console.log('Selected Products:', selectedResources);
  }, [selectedResources]);

  // Sorting logic
  const getSortField = (sortValue) => sortValue.split(' ')[0];
  const getSortDirection = (sortValue) => sortValue.split(' ')[1] || 'asc';

  const sortedProducts = useMemo(() => {
    if (!filteredProducts.length) return [];
    const sortValue = sortSelected[0] || 'created desc';
    const field = getSortField(sortValue);
    const direction = getSortDirection(sortValue);
    return [...filteredProducts].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      if (field === 'inventory') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortSelected]);

  const resourceName = {
    singular: 'product',
    plural: 'products',
  };

  const rowMarkup = sortedProducts.map(
    (
      {
        id,
        image,
        title,
        status,
        inventory,
        type,
        vendor,
      },
      index
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Thumbnail source={image} alt={title} size="small" />
            <Text as="span" variant="bodyMd" truncate>
              {title}
            </Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <StatusBadge status={status} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" tone={inventory > 0 ? 'default' : 'critical'}>
            {inventory > 0 ? `${inventory} in stock` : 'Out of stock'}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{type}</IndexTable.Cell>
        <IndexTable.Cell>{vendor}</IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  const togglePopoverActive = useCallback(() => setPopoverActive((active) => !active), []);

  return (
    <Frame>
      <Page fullWidth>
        {/* Top header: Title and action buttons */}
        <Box paddingBlockStart="4" paddingBlockEnd="2">
          <div style={{ marginBottom: 10 }}>
            <InlineStack align="end" gap="100" blockAlign="center" style={{ paddingBottom: 10 }}>
              <Button onClick={() => handleOpenExportModal('all')} loading={isExporting} disabled={isExporting}>
                        Export All Product
              </Button>
              <Button
                variant="primary"
                        onClick={() => handleOpenExportModal('selected')}
                className="polarisBlackButton"
                loading={isExporting}
                disabled={isExporting}
                    >
                        Export Selected Product
              </Button>
            </InlineStack>
          </div>
        </Box>
        <Box padding="0">
          <LegacyCard style={{ paddingBottom: '1px', marginTop: '24px' }}>
            <IndexFilters
              sortOptions={sortOptions.map(opt => ({
                label: opt.label,
                value: `${opt.value} asc`,
                directionLabel: opt.directionLabel,
              })).concat(sortOptions.map(opt => ({
                label: opt.label,
                value: `${opt.value} desc`,
                directionLabel: opt.directionLabel,
              })))}
              sortSelected={sortSelected}
              queryValue={searchValue}
              queryPlaceholder="Search products"
              onQueryChange={setSearchValue}
              onQueryClear={() => setSearchValue('')}
              onSort={setSortSelected}
              mode={mode}
              setMode={setMode}
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
              filters={filters}
              appliedFilters={[
                ...(vendorFilter.length ? [{key: 'vendor', label: `Vendors: ${vendorFilter.join(', ')}`}]: []),
                ...(tagFilter.length ? [{key: 'tag', label: `Tag: ${tagFilter.join(', ')}`}]: []),
                ...(statusFilter.length ? [{key: 'status', label: `Statuses: ${statusFilter.join(', ')}`}]: []),
              ]}
              onClearAll={handleFiltersClearAll}
              canCreateNewView
              views={views}
              selectedView={selectedView}
              onSelectView={setSelectedView}
              onCreateNewView={name => setViews([...views, {name}])}
              onSaveView={() => {}}
              onUpdateView={() => {}}
              onRemoveView={() => {}}
              cancelAction={{
                onAction: () => {
                  setSearchValue('');
                  setPage(1);
                  setCursorStack([]);
                  setEndCursor(null);
                  fetchProducts(null, 1);
                },
                disabled: false,
                loading: false,
              }}
            />
            {/* Show loading spinner or table */}
              {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
              ) : (
              <IndexTable
                condensed={breakpoints.smDown}
                resourceName={resourceName}
                itemCount={filteredProducts.length}
                selectedItemsCount={
                  allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: 'Product',
                    sortable: true,
                    sortDirection: sortColumn === 'title' ? sortDirection : undefined,
                    onSort: () => {
                      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                      setSortDirection(newDirection);
                      setSortColumn('title');
                      setSortSelected([`title ${newDirection}`]);
                    }
                  },
                  { title: 'Status' },
                  { title: 'Inventory' },
                  { title: 'Type' },
                  { title: 'Vendor' },
                ]}
                fullWidth
              >
                {rowMarkup}
              </IndexTable>
            )}
            {/* Polaris Pagination below the table, left-aligned with range label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start',marginTop: '10px', marginLeft: '32px', gap: '12px' ,paddingBottom: '20px'}}>
              <Pagination
                hasPrevious={cursorStack.length > 0}
                onPrevious={isLoading ? undefined : handlePrevious}
                hasNext={hasNextPage}
                onNext={isLoading ? undefined : handleNext}
                previousTooltip={isLoading ? 'Loading...' : undefined}
                nextTooltip={isLoading ? 'Loading...' : undefined}
              />
              {/* Range label */}
              <span style={{ fontSize: 16, color: '#202223', marginLeft: 8 }}>
                {/* Calculate range based on page and products.length */}
                {products.length > 0 ? `${(page - 1) * PAGE_SIZE + 1}-${(page - 1) * PAGE_SIZE + products.length}` : '0-0'}
              </span>
            </div>
          </LegacyCard>
        </Box>
        {/* Export Modal */}
        <Modal
          open={exportModalOpen}
          onClose={handleCloseExportModal}
          title="Export Products by CSV"
          primaryAction={{
            content: 'Export Products',
            onAction: () => {
              console.log('Export button clicked!');
              handleExport();
            },
            primary: true,
            destructive: false,
            loading: isExporting,
            disabled: isExporting,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: handleCloseExportModal,
              disabled: isExporting,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <div>
                <Text as="h3" variant="headingSm">Export</Text>
                <ChoiceList
                  title=""
                  choices={[
                    { label: 'All Product', value: 'all' },
                    { label: 'Selected Product', value: 'selected' },
                  ]}
                  selected={[exportType]}
                  onChange={([val]) => setExportType(val)}
                />
              </div>
              <div>
                <Text as="h3" variant="headingSm">Export as</Text>
                <Select
                  options={[
                    { label: 'Custom CSV', value: 'customcsv' },
                    { label: 'Shopify CSV', value: 'shopify' },
                    { label: 'WooCommerce CSV', value: 'woocommerce' },
                  ]}
                  value={exportFormat}
                  onChange={setExportFormat}
                />
              </div>
              <Text as="p" variant="bodySm">
                Learn more about{' '}
                <Link url="#" monochrome removeUnderline>
                  export CSV
                </Link>
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
        {toastActive && (
          <Toast content={toastMessage} error={toastError} onDismiss={() => setToastActive(false)} />
        )}
        <Footer />
      </Page>
    </Frame>
  );
} 