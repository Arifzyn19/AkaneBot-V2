import fs from "fs"
import path from "path"
import { download as dlUrl } from "../../lib/social-downloader.js"

export default {
  name: "facebook",
  command: ["facebook", "fb"],
  description: "Download video Facebook dari URL",
  category: "media",
  cooldown: 10,

  async execute(m, { sock }) {
    try {
      const url = (m.text || "").trim()
      if (!/^https?:\/\//i.test(url) || !/facebook\.com|fb\.watch/i.test(url)) {
        return m.reply("❗ Format: .facebook <url facebook>\nContoh: .facebook https://www.facebook.com/.../videos/...")
      }

      await m.reply("📥 Mengunduh video Facebook...")

      const result = await dlUrl(url, { kind: "video", videoFormat: "mp4", output: "downloads" })
      if (!result?.filepath) {
        return m.reply("❌ Gagal mengunduh video Facebook.")
      }

      const filePath = path.resolve(result.filepath)
      const buffer = fs.readFileSync(filePath)

      await sock.sendMessage(
        m.chat,
        { video: buffer, mimetype: "video/mp4", caption: result.title || "Facebook" },
        { quoted: m },
      )

      try {
        fs.unlinkSync(filePath)
      } catch {}
    } catch (e) {
      console.error("facebook error:", e)
      await m.reply("❌ Terjadi kesalahan saat mengunduh Facebook.")
    }
  },
}
