const fs = require('fs');
let text = fs.readFileSync('native/src/api/client.ts', 'utf8');
text = text.replace("throw new axios.Cancel(`OFFLINE_QUEUED:${id}`);", "throw new axios.Cancel(`OFFLINE_QUEUED:${id}`);");
fs.writeFileSync('native/src/api/client.ts', text);
