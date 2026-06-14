/**
 * Validation des cibles de retour OAuth (anti open-redirect).
 *
 * Le `state` OAuth transporte l'URL vers laquelle renvoyer le token après le
 * callback. On n'accepte que :
 * - desktop Tauri : un serveur loopback `http://localhost:PORT` / `127.0.0.1`
 * - mobile Expo : un deep-link applicatif `nestr://…`
 *
 * Tout le reste (https arbitraire, sous-domaines, `..`, caractères hors charset)
 * est rejeté pour empêcher une redirection vers un domaine attaquant.
 */
export const LOOPBACK_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/;
export const APP_SCHEME_RE = /^nestr:\/\/[a-z0-9/_-]*$/i;

export const isAppRedirect = (url: string): boolean =>
  LOOPBACK_RE.test(url) || APP_SCHEME_RE.test(url);
