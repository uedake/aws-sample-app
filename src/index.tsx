import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "react-oidc-context";
import {cognitoAuthConfig, logoutConfig} from "./setting";


const root = ReactDOM.createRoot(document.getElementById("root")!);

console.log(cognitoAuthConfig.redirect_uri)

// wrap the application with AuthProvider
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App {...cognitoAuthConfig} {...logoutConfig}/>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals(console.log);
