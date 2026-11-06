const fs = require('node:fs');
const sax = require('sax');
const descendants = (node, tag) => node.children.flatMap(c => [...(c.tag === tag ? [c] : []), ...descendants(c, tag)]);
const value = node => (node?.text || '').trim();
async function readLod(path) {
  const entries = [];
  const parser = sax.createStream(true);
  let stack = [];
  parser.on('opentag', n => {
    if (n.name !== 'entry' && !stack.length) return;
    const node = { tag: n.name, attrs: n.attributes, children: [], text: '' };
    if (stack.length) stack.at(-1).children.push(node);
    stack.push(node);
  });
  parser.on('text', text => { if (stack.length) stack.at(-1).text += text; });
  parser.on('closetag', () => {
    if (!stack.length) return;
    const n = stack.pop();
    if (n.tag !== 'entry') return;
    entries.push({
      id: n.attrs.id,
      name: value(n.children.find(c => c.tag === 'lemma')),
      plurals: descendants(n, 'inflection').filter(c => c.attrs.type === 'plural').flatMap(c => descendants(c, 'form').flatMap(f => [value(f), f.attrs.nRuleForm].filter(Boolean))),
      tags: descendants(n, 'category').map(value),
      meanings: descendants(n, 'meaning').map(m => ({
        id: m.attrs.id,
        name: value(descendants(m, 'secondaryHeadword')[0]),
        languages: Object.fromEntries(descendants(m, 'targetLanguage').map(l => [l.attrs.lang, {
          words: descendants(l, 'translation').map(value),
          context: descendants(l, 'semanticClarifier').map(value),
        }])),
      })),
    });
  });
  await new Promise((resolve, reject) => { parser.on('end', resolve); parser.on('error', reject); fs.createReadStream(path).on('error', reject).pipe(parser); });
  return entries;
}
module.exports = { readLod };
if (require.main === module) readLod(process.argv[2]).then(entries => fs.writeFileSync(process.argv[3], JSON.stringify(entries)));
