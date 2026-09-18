import { Link, Outlet } from 'react-router-dom';

export function App() {
  return (
    <div className="container">
      <header className="app">
        <h1>
          <Link to="/">📨 Mensageria</Link>
        </h1>
        <Link className="btn" to="/new">
          Nova notificação
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
