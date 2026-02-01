import fs from "fs"
import path from "path"
import { play as dlPlay, download as dlUrl } from "../../lib/social-downloader.js"

export default {
  name: "ytmp3",
  command: ["ytmp3"],
  description: "Download audio (MP3) dari YouTube (URL atau query)",
  category: "media",
  cooldown: 10,

  async execute(m, { sock }) {
    try {
      const text = (m.text || "").trim()
      if (!text) {
        return m.reply(
          "❗ Format: .ytmp3 <url|query>\nContoh: .ytmp3 https://youtu.be/xxxx atau .ytmp3 Noah Separuh Aku",
        )
      }

      await m.reply("📥 Memproses permintaan...")

      let result
      if (/^https?:\/\//i.test(text)) {
        result = await dlUrl(text, { kind: "audio", audioFormat: "mp3", output: "downloads" })
      } else {
        result = await dlPlay(text, { index: 1, audioFormat: "mp3", output: "downloads" })
      }

      if (!result?.filepath) {
        return m.reply("❌ Gagal mengunduh audio.")
      }

      const filePath = path.resolve(result.filepath)
      const buffer = fs.readFileSync(filePath)

      await sock.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: (result.title || "audio") + ".mp3",
        },
        { quoted: m },
      )

      try {
        fs.unlinkSync(filePath)
      } catch {}
    } catch (e) {
      console.error("ytmp3 error:", e)
      await m.reply("❌ Terjadi kesalahan saat mengunduh MP3.")
    }
  },
}
