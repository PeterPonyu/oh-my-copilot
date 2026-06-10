"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const package_json_1 = __importDefault(require("../package.json"));
function run(argv = process.argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        console.log('hello-ts — a minimal TypeScript CLI');
        console.log();
        console.log('Usage: hello-ts [name] [options]');
        console.log();
        console.log('Options:');
        console.log('  -h, --help     Show help');
        console.log('  -v, --version  Show version');
        console.log();
        console.log('Examples:');
        console.log('  hello-ts');
        console.log('  hello-ts Alice');
        return;
    }
    if (args.includes('--version') || args.includes('-v')) {
        console.log(package_json_1.default.version);
        return;
    }
    const name = args.join(' ');
    if (!name) {
        console.log('Hello, World!');
    }
    else {
        console.log(`Hello, ${name}!`);
    }
}
if (require.main === module) {
    run(process.argv);
}
