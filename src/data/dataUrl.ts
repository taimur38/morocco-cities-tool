// Every deploy stamps its data requests with a build id. The data files are
// served with a browser cache lifetime, so without this a returning reader can
// run new code against last deploy's cached data — a missing column then
// crashes the page. The query string changes the URL on each build and leaves
// the files themselves untouched.
declare const __DATA_VERSION__: string;

export const dataUrl = (path: string): string =>
  `${path}${path.includes('?') ? '&' : '?'}v=${__DATA_VERSION__}`;
