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
  const commands = Object.values(plugins)

  // group by category
  const categories = {}
  for (const cmd of commands) {
    const cat = (cmd.category || "general").toLowerCase()
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(cmd)
  }

  // header
  let text =
`Hai ${m.pushName || "User"} 👋
Uptime : ${Function.formatUptime(process.uptime())}
Prefix : ${m.prefix}\n`

  const requested = args[0]?.toLowerCase()

  // === MENU PER CATEGORY ===
  if (requested) {
    const list = categories[requested]
    if (!list) {
      return m.reply(
`Category "${requested}" tidak ditemukan.

Category tersedia:
${Object.keys(categories).sort().map(c => `• ${c}`).join("\n")}`
      )
    }

    text += `\n╭───「 ${requested.toUpperCase()} 」\n`
    for (const cmd of list.sort((a, b) =>
      a.command[0].localeCompare(b.command[0])
    )) {
      const name = Array.isArray(cmd.command) ? cmd.command[0] : cmd.command
      text += `│ • ${m.prefix}${name}\n`
    }
    text += `╰──────────────`

    return m.reply(text)
  }

  // === MENU UTAMA ===
  for (const cat of Object.keys(categories).sort()) {
    const list = categories[cat]
      .map(cmd => Array.isArray(cmd.command) ? cmd.command[0] : cmd.command)
      .sort()

    // bikin 3 command per baris
    const rows = []
    for (let i = 0; i < list.length; i += 3) {
      rows.push(
        list.slice(i, i + 3).map(c => `${c}`).join("   ")
      )
    }

    text += `\n╭───「 ${cat.toUpperCase()} 」\n`
    rows.forEach(r => text += `│ • ${r}\n`)
    text += `╰──────────────\n`
  }

  text += `\nKetik:\n${m.prefix}menu <category>\nContoh:\n${m.prefix}menu download`

  await m.reply(text)
}
};