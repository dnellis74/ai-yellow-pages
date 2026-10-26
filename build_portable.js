// Build the portable single-file copy: index.html with data.js inlined.
// Usage: node build_portable.js
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const data = fs.readFileSync(path.join(dir, "data.js"), "utf8");

if (!html.includes('<script src="data.js"></script>')) {
  console.error("index.html does not contain the expected data.js script tag");
  process.exit(1);
}

const out = html.replace(
  '<script src="data.js"></script>',
  `<script>\n${data}\n</script>`
);
fs.writeFileSync(path.join(dir, "agent-yellow-pages.html"), out);
console.log("wrote agent-yellow-pages.html");
