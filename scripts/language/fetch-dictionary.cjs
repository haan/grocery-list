// Explicit developer setup; application code never downloads language resources.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = require('./source.json');
const destination = path.resolve(__dirname, '../../tmp/lb-spelling');
(async()=>{
  fs.mkdirSync(destination,{recursive:true});
  for(const [file, expected] of Object.entries(source.sha256)) {
    const response=await fetch(`https://raw.githubusercontent.com/spellchecker-lu/dictionary-lb-lu/${source.commit}/${file}`);
    if(!response.ok)throw Error(`Download failed: ${file}: ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error(`Checksum mismatch: ${file}`);
    fs.writeFileSync(path.join(destination,file),bytes);
  }
  console.log('Pinned dictionary and license downloaded to ignored tmp/lb-spelling.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
