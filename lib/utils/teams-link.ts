const TEAMS_URL_RE = /^https:\/\/teams\.microsoft\.com\/.*/

export function isValidTeamsLink(url: string): boolean {
  return TEAMS_URL_RE.test(url.trim())
}
