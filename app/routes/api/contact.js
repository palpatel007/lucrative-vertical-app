import { json } from '@remix-run/node';

// In-memory store for demo (replace with DB logic as needed)
const messages = [];

export const action = async ({ request }) => {
  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    const storeName = formData.get('storeName');
    const collaboratorCode = formData.get('collaboratorCode');
    const storePassword = formData.get('storePassword');
    const reason = formData.get('reason');
    const pageInfo = formData.get('pageInfo');

    if (!name || !email || !message) {
      return json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 });
    }

    // Store in memory (replace with DB save logic)
    messages.push({
      name,
      email,
      message,
      storeName,
      collaboratorCode,
      storePassword,
      reason,
      pageInfo,
      createdAt: new Date().toISOString(),
    });

    return json({ success: true, message: 'Your message has been received. We will contact you soon.' });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 