export const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_kw2EVel03",
  client_id: "2nhr9fcgefnjm7r7ko5h89p6uc",
  redirect_uri: `${window.location.protocol}//${window.location.host}/`,
  response_type: "code",
  scope: "openid email profile",
};
export const logoutConfig ={
  cognito_domain: "https://ap-northeast-1kw2evel03.auth.ap-northeast-1.amazoncognito.com",
}