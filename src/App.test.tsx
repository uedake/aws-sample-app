import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from "react-oidc-context";
import {cognitoAuthConfig, logoutConfig} from "./setting";

test('renders learn react link', () => {
  render(
    <AuthProvider {...cognitoAuthConfig}>
      <App {...cognitoAuthConfig} {...logoutConfig}/>
    </AuthProvider>
  );
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
