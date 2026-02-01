import util from "util";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

export default {
  name: "eval",
  description: "Execute JavaScript code (Owner only)",
  command: [">", "ev", "js"],
  category: "owner",
  cooldown: 0,
  prefix: false,
  isOwner: true,

  async execute(m, { text, sock, Api }) {
    if (!text) {
      return m.reply("❌ Please provide code to execute!");
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const require = createRequire(__dirname);

    let _return = "";

    try {
      _return = /await/i.test(text)
        ? await eval(`(async () => { ${text} })()`)
        : eval(text);

      Promise.resolve(_return)
        .then((res) => m.reply(util.format(res)))
        .catch((err) => m.reply(util.format(err)));
    } catch (error) {
      const errorOutput = util.inspect(error, {
        depth: 2,
        colors: false,
      });
      await m.reply(errorOutput);
    }
  },
};
