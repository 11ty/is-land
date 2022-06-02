let acorn = require("acorn");

class ImportTransformer {
  transformImport(str, node, indexOffset = 0, importMap = {}) {
    let { start, end, value } = node;

    // Could be improved by https://www.npmjs.com/package/@import-maps/resolve
    let resolved = importMap.imports[value];
    if(resolved) {  
      return {
        code: str.slice(0, start + 1 + indexOffset) + resolved + str.slice(end - 1 + indexOffset),
        offset: resolved.length - value.length,
      };
    }
    return {
      code: str,
      offset: 0
    };
  }

  transform(input, importMap) {
    let ast = acorn.parse(input, {sourceType: "module", ecmaVersion: "latest"});

    let indexOffset = 0;
    for(let node of ast.body) {
      if(node.type === "ImportDeclaration") {
        let ret = this.transformImport(input, node.source, indexOffset, importMap);
        input = ret.code;
        indexOffset += ret.offset;
      }
    }

    return input;
  }
}

module.exports = ImportTransformer;
