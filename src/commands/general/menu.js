import { ENV } from "../../config/env.js";
import { plugins } from "../../lib/plugin.js";
import Function from "../../lib/function.js";

export default {
  name: "menu",
  description: "Show available commands",
  command: ["menu", "help"],
  usage: "!menu [category]",
  category: "general",
  aliases: ["help", "h"],
  permissions: ["all"],

  execute: async (m, { args }) => {
    const requestedCategory = args[0]?.toLowerCase();
    const commands = Object.values(plugins);

    const categories = {};
    for (const cmd of commands) {
      const cat = cmd.category || "general";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd);
    }

    let menuText =
`┌────────────────────────
│        AKANE BOT
├────────────────────────
│ User   : ${m.pushName || "User"}
│ Uptime : ${Function.formatUptime(process.uptime())}
│ Prefix : ${m.prefix}
└────────────────────────\n`;

    // jika minta kategori tertentu
    if (requestedCategory) {
      const list = categories[requestedCategory];
      if (!list) {
        return m.reply(
`Category "${requestedCategory}" tidak ditemukan.

Daftar category:
${Object.keys(categories).map(c => `- ${c}`).join("\n")}`
        );
      }

      menuText += `\n[ ${requestedCategory.toUpperCase()} ]\n`;

      for (const cmd of list) {
        const name = Array.isArray(cmd.command) ? cmd.command[0] : cmd.command;
        const prefix = cmd.prefix === false ? "" : m.prefix;
        const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(", ")})` : "";

        menuText += `\n${prefix}${name}${aliases}`;
        if (cmd.description) menuText += `\n  ${cmd.description}`;
        if (cmd.usage) menuText += `\n  Example: ${cmd.usage.replace("!", m.prefix)}`;
        if (cmd.cooldown) menuText += `\n  Cooldown: ${cmd.cooldown}s`;
        menuText += "\n";
      }

      return m.reply(menuText);
    }

    // menu utama semua kategori
    menuText += `\nCOMMAND LIST\n`;

    for (const [category, list] of Object.entries(categories).sort()) {
      const cmds = list
        .map(cmd => {
          const name = Array.isArray(cmd.command) ? cmd.command[0] : cmd.command;
          return `${m.prefix}${name}\n`;
        })
        .join(", ");

      menuText += `\n${category}
  ${cmds}\n`;
    }

    menuText +=
`\nUse:
${m.prefix}menu <category>
to show detailed commands in a category.`;

    await m.reply(menuText);
  },
};