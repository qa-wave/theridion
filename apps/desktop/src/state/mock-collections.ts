import type { Collection } from "./types";

/**
 * Hardcoded collections shown in the sidebar before the project store
 * lands. Replaced once we have file-based projects (Bruno-style).
 */
export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: "github",
    name: "GitHub REST API",
    folders: [
      {
        id: "repos",
        name: "Repositories",
        items: [
          {
            id: "search-repos",
            name: "Search repos",
            method: "GET",
            url: "https://api.github.com/search/repositories?q=tauri&sort=stars",
          },
          {
            id: "repo-info",
            name: "Repository info",
            method: "GET",
            url: "https://api.github.com/repos/tauri-apps/tauri",
          },
          {
            id: "repo-tags",
            name: "Repository tags",
            method: "GET",
            url: "https://api.github.com/repos/tauri-apps/tauri/tags",
          },
        ],
      },
      {
        id: "users",
        name: "Users",
        items: [
          {
            id: "user",
            name: "Get user",
            method: "GET",
            url: "https://api.github.com/users/octocat",
          },
        ],
      },
    ],
  },
  {
    id: "httpbin",
    name: "httpbin (sandbox)",
    folders: [
      {
        id: "methods",
        name: "Methods",
        items: [
          { id: "get", name: "GET", method: "GET", url: "https://httpbin.org/get" },
          { id: "post", name: "POST", method: "POST", url: "https://httpbin.org/post" },
          { id: "put", name: "PUT", method: "PUT", url: "https://httpbin.org/put" },
          { id: "delete", name: "DELETE", method: "DELETE", url: "https://httpbin.org/delete" },
        ],
      },
      {
        id: "status",
        name: "Status codes",
        items: [
          { id: "200", name: "200 OK", method: "GET", url: "https://httpbin.org/status/200" },
          { id: "404", name: "404 Not Found", method: "GET", url: "https://httpbin.org/status/404" },
          { id: "500", name: "500 Server Error", method: "GET", url: "https://httpbin.org/status/500" },
        ],
      },
    ],
  },
];
