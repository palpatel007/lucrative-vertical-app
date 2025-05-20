import { json } from '@remix-run/node';
import ImportHistory from '../models/ImportHistory.js';
import ImportIssue from '../models/ImportIssue.js';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  // Optionally, get userId if needed
  // const userId = url.searchParams.get('userId');
  try {
    const histories = await ImportHistory.find({ shop }).sort({ date: -1 });
    return json(histories);
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

export const action = async ({ request, params }) => {
  const url = new URL(request.url);
  const method = request.method;
  if (method === 'POST') {
    // Create new import history or add issue
    if (url.pathname.endsWith('/issues')) {
      // Add an issue to an import
      const importId = params.id || url.pathname.split('/').slice(-2)[0];
      const { productName, details } = await request.json();
      try {
        const issue = await ImportIssue.create({
          importId,
          productName,
          details,
        });
        return json(issue, { status: 201 });
      } catch (err) {
        return json({ error: err.message }, { status: 500 });
      }
    } else {
      // Create new import history
      const body = await request.json();
      try {
        const history = await ImportHistory.create({
          userId: body.userId,
          shop: body.shop,
          source: body.source,
          fileName: body.fileName,
          dataType: body.dataType,
          status: body.status || 'pending',
        });
        return json(history, { status: 201 });
      } catch (err) {
        return json({ error: err.message }, { status: 500 });
      }
    }
  } else if (method === 'PATCH') {
    // Update import history
    const id = params.id || url.pathname.split('/').slice(-1)[0];
    const update = await request.json();
    try {
      const history = await ImportHistory.findByIdAndUpdate(id, update, { new: true });
      return json(history);
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  } else if (method === 'GET' && url.pathname.match(/\/issues$/)) {
    // Get issues for a specific import
    const importId = params.id || url.pathname.split('/').slice(-2)[0];
    try {
      const issues = await ImportIssue.find({ importId });
      return json(issues);
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }
  return json({ error: 'Not found' }, { status: 404 });
}; 