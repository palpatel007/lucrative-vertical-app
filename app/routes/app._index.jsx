import Dashboard, { loader as dashboardLoader } from './app.dashboard.jsx';

export const loader = async (args) => {
  console.log('[App Index Loader] Called');
  return dashboardLoader(args);
};

export default function Index() {
  return <Dashboard />;
}
