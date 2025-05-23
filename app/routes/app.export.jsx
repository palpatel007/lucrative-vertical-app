import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  Text,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Modal,
  Spinner,
  Thumbnail,
  Pagination,
  IndexTable,
  LegacyCard,
  useIndexResourceState,
  useBreakpoints,
  IndexFilters,
  useSetIndexFiltersMode,
  ChoiceList,
  Toast,
  Frame,
  Card,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  InlineGrid,
  Popover,
  ActionList,
} from '@shopify/polaris';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import shopifyIcon from '../assets/source-icons/shopify.png';
import wooIcon from '../assets/source-icons/woo.png';
import csvIcon from '../assets/source-icons/csv.png';
import amazonIcon from '../assets/source-icons/amazon.png';
import wixIcon from '../assets/source-icons/wix.png';
import bigCommerceIcon from '../assets/source-icons/bigCommerce.png';
import squarespaceIcon from '../assets/source-icons/squarespace.png';
import alibabaIcon from '../assets/source-icons/alibaba.png';
import aliexpresIcon from '../assets/source-icons/aliexpres.svg';
import etsyIcon from '../assets/source-icons/etsy.png';
import ebayIcon from '../assets/source-icons/ebay.png';
import walmartIcon from '../assets/source-icons/walmart.png';
import { ImageIcon } from '@shopify/polaris-icons';
import { useLoaderData } from 'react-router-dom';
import i18n from '../i18n';

const formatIcons = {
  shopify: shopifyIcon,
  woocommerce: wooIcon,
  customcsv: csvIcon,
  amazon: amazonIcon || csvIcon,
  wix: wixIcon || csvIcon,
  bigcommerce: bigCommerceIcon || csvIcon,
  squarespace: squarespaceIcon || csvIcon,
  alibaba: alibabaIcon || csvIcon,
  aliexpress: aliexpresIcon || csvIcon,
  etsy: etsyIcon || csvIcon,
  ebay: ebayIcon || csvIcon,
  walmart: walmartIcon || csvIcon,
};

const formatOptions = [
  { label: 'Shopify CSV', value: 'shopify', icon: formatIcons.shopify },
  { label: 'Custom CSV', value: 'customcsv', icon: formatIcons.customcsv },
  { label: 'WooCommerce CSV', value: 'woocommerce', icon: formatIcons.woocommerce },
  { label: 'Amazon CSV', value: 'amazon', icon: formatIcons.amazon },
  { label: 'Wix CSV', value: 'wix', icon: formatIcons.wix },
  { label: 'BigCommerce CSV', value: 'bigcommerce', icon: formatIcons.bigcommerce },
  { label: 'Squarespace CSV', value: 'squarespace', icon: formatIcons.squarespace },
  { label: 'Alibaba CSV', value: 'alibaba', icon: formatIcons.alibaba },
  // { label: 'AliExpress CSV', value: 'aliexpress', icon: formatIcons.aliexpress },
  { label: 'Etsy CSV', value: 'etsy', icon: formatIcons.etsy },
  { label: 'eBay CSV', value: 'ebay', icon: formatIcons.ebay },
  { label: 'Walmart CSV', value: 'walmart', icon: formatIcons.walmart },
];

const tabs = [
  { id: 'all', content: 'All' },
  { id: 'active', content: 'Active' },
  { id: 'draft', content: 'Draft' },
  { id: 'archived', content: 'Archived' },
  
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

function ExportSkeleton() {
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

      {/* Export Options Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <InlineGrid gap="400" columns={3}>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <SkeletonThumbnail size="large" />
                      <Box paddingBlockStart="200">
                        <SkeletonDisplayText size="small" />
                        <SkeletonBodyText lines={2} />
                      </Box>
                    </div>
                  </Card>
                ))}
              </InlineGrid>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Export Settings Skeleton */}
      <Box paddingBlockEnd="400">
        <Card>
          <div style={{ padding: '20px' }}>
            <SkeletonDisplayText size="medium" />
            <Box paddingBlockStart="400">
              <BlockStack gap="200">
                {[1, 2, 3, 4].map((i) => (
                  <InlineStack key={i} gap="200" align="start">
                    <SkeletonThumbnail size="small" />
                    <div style={{ flex: 1 }}>
                      <SkeletonBodyText lines={1} />
                    </div>
                  </InlineStack>
                ))}
              </BlockStack>
            </Box>
          </div>
        </Card>
      </Box>

      {/* Recent Exports Skeleton */}
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

function FormatSelect({ value, onChange, options, active, onToggle, onClose }) {
  return (
    <Box>
      <Popover
        active={active}
        activator={
          <Button disclosure onClick={onToggle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
              {options.find(opt => opt.value === value)?.icon && (
                <img
                  src={options.find(opt => opt.value === value).icon}
                  alt={options.find(opt => opt.value === value).label}
                  style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
                />
              )}
              {options.find(opt => opt.value === value)?.label}
            </span>
          </Button>
        }
        onClose={onClose}
      >
        <ActionList
          actionRole="menuitem"
          items={options.map(opt => ({
            content: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {opt.icon && (
                  <img
                    src={opt.icon}
                    alt={opt.label}
                    style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain', marginRight: 8, background: '#fff' }}
                  />
                )}
                {opt.label}
              </span>
            ),
            active: value === opt.value,
            onAction: () => {
              onChange(opt.value);
              onClose();
            },
          }))}
        />
      </Popover>
    </Box>
  );
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
  const [formatPopoverActive, setFormatPopoverActive] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    includeVariations: true,
    includeSpecifications: true,
    includeFeatures: true,
    includeShipping: true,
    includeRatings: true,
  });
  const rawLoaderData = useLoaderData && typeof useLoaderData === 'function' ? useLoaderData() : {};
  const loaderData = rawLoaderData || {};
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

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

      if (!response.ok) {
        if (data.upgradeUrl) {
          handleCloseExportModal();
          alert(data.error || "You have reached your export limit. Please upgrade your plan.");
          setTimeout(() => {
            navigate('/app/billing');
          }, 2000);
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
      const url = `/api/products/export?type=${exportType}&format=${exportFormat}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: selectedResources,
          format: exportFormat,
          type: exportType,
          settings: exportSettings
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.upgradeUrl) {
          showErrorToast(data.error || "You have reached your export limit. Please upgrade your plan.");
          setTimeout(() => {
            navigate('/app/billing');
          }, 2000);
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
      let filename = `products-${exportFormat}-${new Date().toISOString().split('T')[0]}.csv`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showSuccessToast('Export successful!');
    } catch (error) {
      if (error.message.includes('Export limit exceeded')) {
        const shopId = new URLSearchParams(window.location.search).get('shop');
        if (shopId) {
          showErrorToast('Export limit exceeded. Please upgrade your plan.');
          setTimeout(() => {
            navigate('/app/billing');
          }, 2000);
          return;
        }
      }
      showErrorToast(error.message || 'Failed to export products. Please try again.');
    } finally {
      setIsExporting(false);
      handleCloseExportModal();
    }
  };

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
            <Thumbnail source={image ? image : ImageIcon} alt={title} size="small" />
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
  const toggleFormatPopover = useCallback(() => setFormatPopoverActive(active => !active), []);

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '10px', gap: '12px', paddingBottom: '20px', marginLeft: '15px' }}>
              <Pagination
                hasPrevious={page > 1}
                onPrevious={isLoading ? undefined : handlePrevious}
                hasNext={hasNextPage}
                onNext={isLoading ? undefined : handleNext}
                label={`${page}/${Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))}`}
              />
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
            onAction: handleExport,
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
              <Text as="h2" variant="headingMd">
                Select Export Format
              </Text>
              <FormatSelect
                value={exportFormat}
                onChange={setExportFormat}
                options={formatOptions}
                active={formatPopoverActive}
                onToggle={toggleFormatPopover}
                onClose={() => setFormatPopoverActive(false)}
              />
              
              {exportFormat === 'amazon' && (
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">
                    Amazon Export Settings
                  </Text>
                  <ChoiceList
                    title="Include in Export"
                    choices={[
                      {label: 'Product Variations', value: 'includeVariations'},
                      {label: 'Product Specifications', value: 'includeSpecifications'},
                      {label: 'Product Features', value: 'includeFeatures'},
                      {label: 'Shipping Information', value: 'includeShipping'},
                      {label: 'Ratings and Reviews', value: 'includeRatings'},
                    ]}
                    selected={Object.entries(exportSettings)
                      .filter(([_, value]) => value)
                      .map(([key]) => key)}
                    onChange={(selected) => {
                      const newSettings = { ...exportSettings };
                      Object.keys(exportSettings).forEach(key => {
                        newSettings[key] = selected.includes(key);
                      });
                      setExportSettings(newSettings);
                    }}
                    allowMultiple
                  />
                </BlockStack>
              )}
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