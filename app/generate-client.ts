import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor as renderJavaScriptVisitor } from '@codama/renderers-js';
import * as path from 'path';
import * as fs from 'fs';

const idlPath = path.join(__dirname, '../target/idl/privyfi.json');
const outputDir = path.join(__dirname, 'src/lib/generated');

async function generate() {
    console.log('Reading Anchor IDL...');
    const idlRaw = fs.readFileSync(idlPath, 'utf8');
    const idl = JSON.parse(idlRaw);

    console.log('Converting IDL to Codama nodes...');
    const codama = createFromRoot(rootNodeFromAnchor(idl));

    console.log('Generating JavaScript client...');
    codama.accept(
        renderJavaScriptVisitor(outputDir, {
            formatCode: true,
        })
    );

    console.log(`✅ Client successfully generated at ${outputDir}`);
}

generate().catch(console.error);
