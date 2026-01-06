const { execSync } = require("child_process");
const ip = require("ip");

const host = ip.address();
console.log(`Starting Next dev server at host: ${host}`);

execSync(`npx next dev -H ${host}`, { stdio: "inherit" });
