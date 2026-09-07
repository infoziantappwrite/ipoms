"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const data = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../../scratch/september_placeholder_enrichments.json'), 'utf8'));
const strictPlaceholders = data.filter((item) => item.matchedMetadataDocs.some((d) => d.sno >= 3807 && d.sno <= 3998));
console.log(`Total enrichable items: ${data.length}`);
console.log(`Strict 3807-3998 Placeholder Matches: ${strictPlaceholders.length}`);
console.log(JSON.stringify(strictPlaceholders.slice(0, 10), null, 2));
