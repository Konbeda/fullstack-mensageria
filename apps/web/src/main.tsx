import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './app';
import { CreatePage } from './pages/create-page';
import { DetailPage } from './pages/detail-page';
import { ListPage } from './pages/list-page';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ListPage /> },
      { path: 'new', element: <CreatePage /> },
      { path: 'notifications/:id', element: <DetailPage /> },
    ],
  },
]);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('elemento #root não encontrado');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
