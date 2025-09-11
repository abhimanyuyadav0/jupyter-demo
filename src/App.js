import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import Header from './components/header/Header';
import HomePage from './pages/home';
import { loadSavedConnections } from './redux/slices/jupyterSlice';
import { credentialsAPI } from './services/api';
import { useDispatch } from 'react-redux';
import './App.css';
import DatabasePage from './pages/database';
import ViewDatabasePage from './pages/database/view';
import UseCasePage from './pages/usecase';

function AppBootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    const loadServerConnections = async () => {
      try {
        // Fetch all to avoid session mismatch hiding existing credentials
        const server = await credentialsAPI.getConnections(true);
        const safe = Array.isArray(server) ? server.map(conn => ({
          id: conn.id,
          name: conn.name,
          config: {
            host: conn.config?.host,
            port: String(conn.config?.port ?? ''),
            database: conn.config?.database,
            username: conn.config?.username,
            password: ''
          },
          type: conn.type,
          status: conn.status || 'disconnected',
          lastConnected: conn.lastConnected || null,
          createdAt: conn.createdAt || null,
          hasSecureCredentials: !!conn.hasSecureCredentials
        })) : [];
        dispatch(loadSavedConnections(safe));
      } catch (_) {
        dispatch(loadSavedConnections([]));
      }
    };
    loadServerConnections();
  }, [dispatch]);
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <AppBootstrap />
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/usecase/:id" element={<UseCasePage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/database/:id" element={<ViewDatabasePage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
