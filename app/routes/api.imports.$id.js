import { json } from '@remix-run/node';
import ImportHistory from '../models/ImportHistory.js';

export const loader = async ({ params }) => {
  if (params.id === 'active') {
    // TODO: Replace with your actual logic to fetch active imports
    return json({ message: 'Active imports endpoint not yet implemented.' });
  }
  return json({ error: 'Not found' }, { status: 404 });
};

export const action = async ({ request, params }) => {
  if (request.method === 'PATCH') {
    const update = await request.json();
    try {
      const history = await ImportHistory.findByIdAndUpdate(params.id, update, { new: true });
      return json(history);
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }
  return json({ error: 'Not found' }, { status: 404 });
}; 