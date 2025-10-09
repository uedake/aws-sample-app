import React, { ReactNode, useEffect, useState } from "react";
import { configureAWS, REGION } from "./config";
import { fetchAuthSession, signInWithRedirect, signOut, getCurrentUser, AuthSession, AuthUser } from "@aws-amplify/auth";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

configureAWS();

type Props = {
  children: (
    session: AuthSession,
    user: AuthUser,
    refreshAuth: (force: boolean) => Promise<void>
  ) => ReactNode;
};

const Auth: React.FC<Props> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | undefined>(undefined)
  const [user, setUser] = useState<AuthUser | undefined>(undefined)
  const refreshAuth = async (force: boolean = true) => {
    try {
      const _session = await fetchAuthSession({ forceRefresh: force });

      console.log("session", _session)
      if (!_session.tokens) {
        // 未認証なら Hosted UI にリダイレクト
        console.log("redirect")
        await signInWithRedirect();
        console.error("here never called")
        return;
      }

      // 認証済み
      const user = await getCurrentUser()
      console.log("user", user)
      setSession(_session)
      setUser(user)

      const stsClient = new STSClient({
        region: REGION,
        credentials: _session.credentials,
      });
      const response = await stsClient.send(new GetCallerIdentityCommand({}));
      console.log("sts", response)

      const access_exp = _session.tokens?.accessToken?.payload?.exp!
      const id_exp = _session.tokens?.idToken?.payload?.exp
      const exp = id_exp ? Math.min(access_exp, id_exp) : access_exp
      const margin_sec = 10
      const sec = exp - (Date.now() / 1000) - margin_sec
      setTimeout(refreshAuth, sec * 1000)
    } catch (err) {
      console.error("Error initializing app:", err);
    }
  };

  useEffect(() => {
    refreshAuth(false);
  }, []);

  const handleSignOut = async () => {
    await signOut({ global: true });
  };

  return (
    session ?
      <div>
        <button onClick={handleSignOut}>Sign Out</button>
        {children(session!, user!, refreshAuth)}
      </div> :
      <div>
        <button onClick={handleSignOut}>Sign Out</button>
        <p>認証情報を取得中</p>
      </div>
  );
};

export default Auth;
