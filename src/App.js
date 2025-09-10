import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import Header from './components/Header';
import Home from './components/Home';
import UseCaseDetail from './components/UseCaseDetail';
import LiveDemo from './components/LiveDemo';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/usecase/:id" element={<UseCaseDetail />} />
              <Route path="/live-demo" element={<LiveDemo />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
