import fs from "fs"
import path from "path"
import { download as dlUrl } from "../../lib/social-downloader.js"

export default {
  name: "ytmp4",
  command: ["ytmp4"],
  description: "Download video (MP4) dari YouTube",
  category: "media",
  cooldown: 15,

  async execute(m, { sock }) {
    try {
      const url = (m.text || "").trim()
      if (!/^https?:\/\//i.test(url)) {
        return m.reply("❗ Format: .ytmp4 <url YouTube>\nContoh: .ytmp4 https://youtu.be/xxxx")
      }

      await m.reply("📥 Mengunduh video...")

      const result = await dlUrl(url, { kind: "video", videoFormat: "mp4", output: "downloads" })
      if (!result?.filepath) {
        return m.reply(`❌ Gagal mengunduh video: ${result?.message || "unknown error"}`)
      }

      const filePath = path.resolve(result.filepath)
      const stats = fs.statSync(filePath)
      const fileSizeMB = stats.size / (1024 * 1024)
      const buffer = fs.readFileSync(filePath)

      if (fileSizeMB > 100) {
        await sock.sendMessage(m.chat, {
          document: buffer,
          mimetype: "video/mp4",
          fileName: (result.title || "video") + ".mp4",
        }, { quoted: m })
      } else {
        await sock.sendMessage(m.chat, {
          video: buffer,
          caption: result.title || "YouTube Video",
        }, { quoted: m })
      }

      try {
        fs.unlinkSync(filePath)
      } catch {}
    } catch (e) {
      console.error("ytmp4 error:", e)
      await m.reply("❌ Terjadi kesalahan saat mengunduh MP4.")
    }
  },
}