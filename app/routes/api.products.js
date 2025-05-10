import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const page = parseInt(url.searchParams.get('page') || '1');
  const cursor = url.searchParams.get('cursor') || null;
  const search = url.searchParams.get('search') || '';

  console.log('API Request params:', { limit, page, cursor, search }); // Debug log

  let admin;
  try {
    const { admin: shopifyAdmin, session } = await authenticate.admin(request);
    
    if (!session?.shop) {
      return json({ 
        success: false, 
        error: 'Please log in to continue'
      }, { status: 401 });
    }

    if (!shopifyAdmin) {
      return json({ 
        success: false, 
        error: 'No admin access'
      }, { status: 401 });
    }
    
    admin = shopifyAdmin;
  } catch (error) {
    return json({ 
      success: false, 
      error: 'Please log in to continue'
    }, { status: 401 });
  }

  try {
    const query = `
      query getProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              status
              vendor
              productType
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    inventoryQuantity
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;
    const variables = {
      first: limit,
      after: cursor,
      query: search ? `title:*${search}*` : null
    };

    const response = await admin.graphql(query, { variables });
    const responseJson = await response.json();

    if (!responseJson.data?.products) {
      return json({ 
        success: false, 
        error: 'Failed to fetch products'
      }, { status: 500 });
    }

    const products = responseJson.data.products.edges.map(edge => {
      const node = edge.node;
      return {
        id: node.id.split('/').pop(),
        title: node.title,
        handle: node.handle,
        status: node.status,
        vendor: node.vendor,
        type: node.productType,
        category: node.productType,
        image: (node.images.edges[0] && node.images.edges[0].node.url) || '',
        inventory: (node.variants.edges[0] && node.variants.edges[0].node.inventoryQuantity) || 0,
        price: (node.variants.edges[0] && node.variants.edges[0].node.price) || '0.00',
        salesChannels: node.publications?.edges.map(e => e.node.name) || [],
        b2bCatalogs: [],
      };
    });

    return json({
      success: true,
      products,
      pagination: {
        hasNextPage: responseJson.data.products.pageInfo.hasNextPage,
        endCursor: responseJson.data.products.pageInfo.endCursor,
        currentPage: page,
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length
      }
    });
  } catch (error) {
    console.error('API Error:', error); // Debug log
    return json({ 
      success: false, 
      error: 'Failed to fetch products'
    }, { status: 500 });
  }
}; 