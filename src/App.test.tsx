import { render, screen } from '@testing-library/react';
import App from './App';
import Auth from './Auth';

test('renders learn react link', () => {
  render(
    <Auth>
      {
        (session, user, refreshAuth) => <App session={session} user={user} refreshAuth={refreshAuth} />
      }
    </Auth>
  );
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
