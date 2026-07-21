import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
mkdirSync(dist, { recursive: true });
writeFileSync(
  resolve(dist, "index.html"),
  [
    "<!doctype html>",
    '<html lang="vi">',
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<link rel="stylesheet" href="./styles.css" />',
    "<title>BuyOrSell 4.0 Frontend Components</title>",
    "</head>",
    "<body>",
    "<main>BuyOrSell 4.0 frontend component bundle is typechecked in CI.</main>",
    "</body>",
    "</html>",
  ].join(""),
);
