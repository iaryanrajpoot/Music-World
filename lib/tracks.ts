export type Track = {
  id: string;
  title: string;
  artist: string;
  film: string;
  year: number;
  /** mm:ss, shown before playback starts / if the API duration lookup fails */
  duration: string;
  /** YouTube video ID — the embed must come from the rights holder's own
   *  upload with embedding enabled. See the note below before editing. */
  videoId: string;
};

export type ManualPlaylist = {
  kind: "manual";
  id: string;
  name: string;
  tracks: Track[];
};

export type YouTubePlaylist = {
  kind: "youtube";
  id: string;
  name: string;
  /** The `list=` value from a youtube.com/playlist?list=... URL. Playback,
   *  ordering, and skipping unembeddable videos are all handled by YouTube
   *  itself — nothing about the playlist's contents is looked up or stored
   *  here. */
  listId: string;
};

export type PlaylistSource = ManualPlaylist | YouTubePlaylist;

/**
 * -----------------------------------------------------------------------
 * ADDING SONGS — read this first
 * -----------------------------------------------------------------------
 * Two ways to add music:
 *
 * 1. A "youtube" playlist entry — point it at any playlist ID (the `list=`
 *    part of a youtube.com/playlist?list=... URL) and the player streams
 *    straight from it: order, titles, and skipping broken/unembeddable
 *    videos are all handled by YouTube's own playlist mechanics. Nothing
 *    about the songs is hardcoded here.
 *
 * 2. A "manual" playlist entry — a hand-picked Track array for when you
 *    want explicit control over order/metadata. `videoId: "REPLACE_ME"` is
 *    a placeholder, not a real ID — the player treats it as a load error
 *    and skips it, which is intentional: nothing plays until you add IDs
 *    for tracks you actually have the right to use (official rights-holder
 *    uploads with embedding enabled). Adding one is a one-line change —
 *    duplicate a Track object and fill in the five fields.
 * -----------------------------------------------------------------------
 */

export const playlists: PlaylistSource[] = [
  {
    kind: "youtube",
    id: "bus-driver-ki-playlist",
    name: "Gold",
    listId: "PLeatb7hupNV_AWUl_7ttbsKeCQh8tF5N4",
  },
  {
    kind: "youtube",
    id: "kishore-kumar",
    name: "Kishore Kumar",
    listId: "PLbxTHLeRGq3zQqVjrpD7_-29Kq9l6f_kX",
  },
  {
    kind: "youtube",
    id: "long-drive",
    name: "Long Drive",
    listId: "PL2n9PsUx_VHcVgOATXGVFFP9IXjYO6wMY",
  },
  {
    kind: "youtube",
    id: "new-songs",
    name: "New Songs",
    listId: "PLbJ45w7CHY3S1MZNQJymDz4Gg00IK0T99",
  },
  // {
  //   kind: "manual",
  //   id: "evening-static",
  //   name: "Evening Static",
  //   tracks: [
  //     {
  //       id: "es-1",
  //       title: "Track One",
  //       artist: "Artist Name",
  //       film: "Film Name",
  //       year: 1975,
  //       duration: "4:12",
  //       videoId: "REPLACE_ME",
  //     },
  //     {
  //       id: "es-2",
  //       title: "Track Two",
  //       artist: "Artist Name",
  //       film: "Film Name",
  //       year: 1978,
  //       duration: "3:47",
  //       videoId: "REPLACE_ME",
  //     },
  //     {
  //       id: "es-3",
  //       title: "Track Three",
  //       artist: "Artist Name",
  //       film: "Film Name",
  //       year: 1981,
  //       duration: "5:03",
  //       videoId: "REPLACE_ME",
  //     },
  //   ],
  // },
  // {
  //   kind: "manual",
  //   id: "shop-counter",
  //   name: "Shop Counter",
  //   tracks: [
  //     {
  //       id: "sc-1",
  //       title: "Track One",
  //       artist: "Artist Name",
  //       film: "Film Name",
  //       year: 1969,
  //       duration: "3:58",
  //       videoId: "REPLACE_ME",
  //     },
  //     {
  //       id: "sc-2",
  //       title: "Track Two",
  //       artist: "Artist Name",
  //       film: "Film Name",
  //       year: 1972,
  //       duration: "4:31",
  //       videoId: "REPLACE_ME",
  //     },
  //   ],
  // },
];