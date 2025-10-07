import React, { ReactNode, useEffect, useState } from "react";
import { configureAWS } from "./config";
import { fetchAuthSession, signInWithRedirect, signOut, getCurrentUser } from "@aws-amplify/auth";
import { AWSCredentials } from "@aws-amplify/core/dist/esm/singleton/Auth/types"
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

configureAWS();

type Props = {
  children: (creds: AWSCredentials) => ReactNode;
};

const Auth: React.FC<Props> = ({ children }) => {
  const [creds, setCreds] = useState<AWSCredentials | undefined>(undefined)
  useEffect(() => {
    const init = async () => {
      try {
        const session = await fetchAuthSession();

        console.log("session", session)
        // 未認証なら Hosted UI にリダイレクト
        if (!session.tokens) {
          console.log("redirect")
          await signInWithRedirect();
          return;
        }

        // 認証済み
        const user = await getCurrentUser()
        console.log("user", user)
        const creds = session.identityId ? session.credentials : undefined;
        setCreds(creds)


        const sts = new STSClient({
          credentials: creds,
          region: "ap-northeast-1"
        });

        const identity = await sts.send(new GetCallerIdentityCommand({}));
        console.log("role arn", identity.Arn); // IAM ロール ARN がわかる


      } catch (err) {
        console.error("Error initializing app:", err);
      }
    };
    init();
  }, []);

  const handleSignOut = async () => {
    await signOut({ global: true });
  };

  return (
    creds ?
      <div>
        <button onClick={handleSignOut}>Sign Out</button>
        {children(creds!)}
      </div> :
      <div>
        <button onClick={handleSignOut}>Sign Out</button>
        <p>認証情報を取得中</p>
      </div>
  );
};

export default Auth;
