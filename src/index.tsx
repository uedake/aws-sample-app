import ReactDOM from 'react-dom/client';
import './index.css';
import Auth from './Auth';
import App from './App';
import reportWebVitals from './reportWebVitals';


const root = ReactDOM.createRoot(document.getElementById("root")!);

// wrap the application with AuthProvider
root.render(
  // <React.StrictMode>
  <Auth>
    {
      (session, user, refreshAuth) => <App session={session} user={user} refreshAuth={refreshAuth} />
    }
  </Auth>
  // </React.StrictMode>
);

reportWebVitals(console.log);
