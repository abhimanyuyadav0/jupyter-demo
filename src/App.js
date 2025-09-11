import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import store from "./redux/store";
import Header from "./components/header/Header";
import HomePage from "./pages/home";
import "./App.css";
import DatabasePage from "./pages/database";
import ViewDatabasePage from "./pages/database/view";
import UseCasePage from "./pages/usecase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/usecase/:id" element={<UseCasePage />} />
                <Route path="/database" element={<DatabasePage />} />
                <Route path="/database/:id" element={<ViewDatabasePage />} />
              </Routes>
            </main>
            <ReactQueryDevtools
              initialIsOpen={false}
              buttonPosition="bottom-right"
              buttonType="button"
              toggleButtonProps={{
                style: {
                  backgroundColor: "white",
                  color: "black",
                  border: "1px solid black",
                },
              }}
            />
          </div>
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
