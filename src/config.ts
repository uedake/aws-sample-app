import { Amplify } from "aws-amplify";

//ユーザーのAWSリソースに合わせて設定////////////////////

export const REGION = "ap-northeast-1"
const USER_POOL_POSTFIX = "kw2EVel03"
const USER_POOL_ID = `${REGION}_${USER_POOL_POSTFIX}`
const USER_POOL_CLIENT_ID = "7k8a3h0gto61gdes5b32i3he2q"
const identityPoolIdDict = {
  test: "ap-northeast-1:1f94fda5-7ce9-48ae-9377-0d18f0fa37e8",
  dev: "ap-northeast-1:4f68111a-4328-470d-a720-9008d514357c",
  main: "ap-northeast-1:7931b3ca-de4f-46e9-a448-d93a180b9120"
}
const ENV_KEYS = {
  BRANCH: "REACT_APP_Branch",
} as const;
export const IOT_ENDPOINT = "d07894426ulazezt0ey1-ats.iot.ap-northeast-1.amazonaws.com"
//////////////////////////////////////////////////////
export const branch = process.env ? (process.env[ENV_KEYS.BRANCH] || "test") : "test"
if (branch !== "main" && branch !== "dev" && branch !== "test") {
  throw Error("implemented error")
}
export const identityPoolId = identityPoolIdDict[branch]

export function configureAWS() {
  const redirect_uri = `${window.location.protocol}//${window.location.host}/`

  const authconfig = {
    Auth: {
      Cognito: {
        userPoolId: USER_POOL_ID,
        userPoolClientId: USER_POOL_CLIENT_ID,
        identityPoolId: identityPoolId,
        loginWith: {
          oauth: {
            domain: `${REGION}${USER_POOL_POSTFIX}.auth.${REGION}.amazoncognito.com`,
            scopes: ["email", "openid", "aws.cognito.signin.user.admin"],
            responseType: "code" as const,
            redirectSignIn: [redirect_uri],
            redirectSignOut: [redirect_uri],
          }
        }
      }
    }
  };
  Amplify.configure(authconfig)
};