import * as path from 'path';
import * as fs from 'fs';

export default function (moduleName: string) {
    const dir = path.join(process.cwd(), path.dirname(moduleName));
    const module = fs.readdirSync(dir)
        .find(f => path.basename(f, path.extname(f)) === moduleName);
    return require(`${dir}/${module}`);
}