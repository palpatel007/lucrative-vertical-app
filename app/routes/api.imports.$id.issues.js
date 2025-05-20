import { json } from '@remix-run/node';
import ImportIssue from '../models/ImportIssue.js';

export const loader = async ({ params }) => {
  try {
    const issues = await ImportIssue.find({ importId: params.id });
    return json(issues);
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

export const action = async ({ request, params }) => {
  if (request.method === 'POST') {
    const { productName, details } = await request.json();
    try {
      const issue = await ImportIssue.create({
        importId: params.id,
        productName,
        details,
      });
      return json(issue, { status: 201 });
    } catch (err) {
      return json({ error: err.message }, { status: 500 });
    }
  }
  return json({ error: 'Not found' }, { status: 404 });
}; 