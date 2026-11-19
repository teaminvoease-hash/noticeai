import AppErrorBoundary from "./components/platform/AppErrorBoundary";
import React from "react";
import "@fontsource-variable/inter";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./redux/store/store";
import { SessionGate } from "./session";
import App from "./App";
createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <Provider store={store}>
      <SessionGate>
        <App />
      </SessionGate>
    </Provider>
  </AppErrorBoundary>,
);
