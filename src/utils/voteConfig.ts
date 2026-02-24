export const VOTE_API_URL =
  import.meta.env.PUBLIC_VOTE_API_URL ??
  (import.meta.env.DEV
    ? "https://api.jeromeabel.net/vote-staging.php"
    : "https://api.jeromeabel.net/vote.php");
