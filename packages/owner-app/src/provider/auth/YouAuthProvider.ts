// Authenticate for a third party
export const createHomeToken = async (returnUrl: string): Promise<boolean> => {
  returnUrl = `${returnUrl}${returnUrl.indexOf('?') !== -1 ? '&' : '?'}identity=${
    window.location.hostname
  }`;
  const url = `/youauth/create-token-flow?returnUrl=${encodeURIComponent(returnUrl)}`;

  // it's a chain of redirects from the server, we don't need to trigger with a xhr request
  window.location.href = `https://${window.location.host}/api/owner/v1${url}`;

  return true;
};
