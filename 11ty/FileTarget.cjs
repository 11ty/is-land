const fs = require("fs");
const path = require("path");

// Writes the isomorphic component JS file to the output directory
class FileTarget {
  constructor(filename) {
    this.filename = filename;
    this.parsed = path.parse(filename);
    this.suffix = ".client";
  }

  setSuffix(suffix) {
    this.suffix = suffix;
  }

  getFilename() {
    return this.parsed.name + this.suffix + ".js";
  }

  getImportUrl() {
    return "/" + path.join(this.parsed.dir, this.getFilename());
  }

  getOutputFile() {
    // TODO change _site to work with any output dir
    return path.join("./_site", this.parsed.dir, this.getFilename());
  }

  async augmentContent(content, importMap) {
    const { ImportTransformer } = await import("esm-import-transformer");

    let transformer = new ImportTransformer(content);
    let code = transformer.transformWithImportMap(importMap);
    return code;
  }

  async write(content, importMap, options = {}) {

    if(importMap) {
      content = await this.augmentContent(content, importMap);
    }

    let outputFile = this.getOutputFile();
    let {dir} = path.parse(outputFile);
    fs.mkdirSync(dir, {recursive: true});

    // TODO this writes every time it’s referenced
    console.log( "Writing", outputFile );
    fs.writeFileSync(outputFile, content, "utf8");
  }
}

module.exports = FileTarget;