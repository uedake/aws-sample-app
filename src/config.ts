import { Amplify } from "aws-amplify";

//ユーザーのAWSリソースに合わせて設定////////////////////

export const ACCOUNT = "821721610090"
export const REGION = "ap-northeast-1"
const USER_POOL_POSTFIX = "kw2EVel03"
const USER_POOL_ID = `${REGION}_${USER_POOL_POSTFIX}`
const USER_POOL_CLIENT_ID = "7k8a3h0gto61gdes5b32i3he2q"
const identityPoolIdDict = {
  test: "ap-northeast-1:c5cae8fb-d98c-4157-843e-08059fe5d68f",
  dev: "ap-northeast-1:41ea0453-9fc2-44bd-bdf9-8219a55cedc5",
  main: "ap-northeast-1:f1954f13-dfa2-4aed-a9e7-a673c50cdccc"
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
export const MQTT_CONFIG = {
  region: REGION,
  endpoint: `wss://${IOT_ENDPOINT}/mqtt`,
}

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
    },
    // PubSub: {
    //   AWSIoT: MQTT_CONFIG,
    // },
  };
  Amplify.configure(authconfig)
};