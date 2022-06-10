const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  let md = markdownIt({ html: true })

  // disable auto-indent to code block
  md.disable('code');

  // Lots of code to disable default <p></p> wrap around raw <is-land>
  // Easier workaround is to wrap the <is-land> in a <div> or other block-level HTML
  const proxy = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);
  const defaultRenderer = md.renderer.rules.html_block || proxy;

  function contentCheck(token) {
    return token.content.trim().startsWith("<is-land ") || token.content.trim().startsWith("<is-land>");
  }

  md.renderer.rules.html_block = function(tokens, idx, options, env, self) {
    tokens = tokens.map((token, index) => {
      if(token.type === "paragraph_open") {
        if(contentCheck(tokens[index + 1])) {
          token.type = "html_block";
          token.tag = "";
        }
      }
      if(token.type === "paragraph_close") {
        if(contentCheck(tokens[index - 1])) {
          token.type = "html_block";
          token.tag = "";
        }
      }

      if(token.content.startsWith("<is-land ")) {
        token.type = "html_block";
        token.children = null;
        token.level = 0;
        token.content = `\n${token.content}\n\n`;
      }
      return token;
    });

    return defaultRenderer(tokens, idx, options, env, self)
  };

  eleventyConfig.setLibrary("md", md);
};