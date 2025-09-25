import { useAuth } from "react-oidc-context";
import { OidcClientSettings } from 'oidc-client-ts';

export declare interface LogoutConfig{
    cognito_domain: string;
}
export declare type AppProps = OidcClientSettings & LogoutConfig;

function App(props: AppProps) {
  const auth = useAuth();

  const signOutRedirect = () => {
    window.location.href = `${props.cognito_domain}/logout?client_id=${props.client_id}&logout_uri=${encodeURIComponent(props.redirect_uri)}`;
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> {JSON.stringify(auth.user?.profile, null, 2)} </pre>

        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
    </div>
  );
}

export default App;