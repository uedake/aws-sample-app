import { render, screen } from '@testing-library/react';
import App from './App';
import Auth from './Auth';

test('renders learn react link', () => {
  render(
    <Auth>
      {
        (creds) => <App creds={creds} />
      }
    </Auth>
  );
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
