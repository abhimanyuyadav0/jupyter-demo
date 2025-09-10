import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import Header from './components/Header';
import Home from './components/Home';
import UseCaseDetail from './components/UseCaseDetail';
import LiveDemo from './components/LiveDemo';
import { connectionStorage } from './services/connectionStorage';
import { loadSavedConnections } from './redux/slices/jupyterSlice';
import { useDispatch } from 'react-redux';
import DatabaseExplorer from './components/DatabaseExplorer';
import './App.css';

function AppBootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    const saved = connectionStorage.loadConnections();
    if (saved && Array.isArray(saved)) {
      dispatch(loadSavedConnections(saved));
    }
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
              <Route path="/" element={<Home />} />
              <Route path="/usecase/:id" element={<UseCaseDetail />} />
              <Route path="/live-demo" element={<LiveDemo />} />
              <Route path="/live-demo/db/:id" element={<DatabaseExplorer />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
