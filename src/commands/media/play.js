import fs from "fs"
import path from "path"
import { play as dlPlay } from "../../lib/social-downloader.js"

export default {
  name: "play",
  command: ["play"],
  description: "Cari dan download lagu dari YouTube lalu kirim sebagai audio",
  category: "media",
  cooldown: 10,

  async execute(m, { sock }) {
    try {
      const query = (m.text || "").trim()
      if (!query) {
        return m.reply("❗ Format: .play <judul lagu>\nContoh: .play Noah Separuh Aku")
      }

      await m.reply("🔎 Mencari lagu...")

      const result = await dlPlay(query, { index: 1, audioFormat: "mp3", output: "downloads" })
      if (!result?.filepath) {
        return m.reply(`❌ Gagal download audio: ${res?.message || "unknown error"}`)
      }

      const filePath = path.resolve(result.filepath)
      const ext = path.extname(filePath).toLowerCase()
      const mime = ext === ".mp3" ? "audio/mpeg" : "audio/mp4"

      await m.reply(`✅ Ditemukan: ${result.title || query}\n🎵 Mengirim audio...`)
      const buffer = fs.readFileSync(filePath)
      await sock.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: mime,
          ptt: false,
          fileName: (result.title || "audio") + ext,
        },
        { quoted: m },
      )

      // Bersihkan file setelah terkirim
      try {
        fs.unlinkSync(filePath)
      } catch {}
    } catch (err) {
      console.error("play command error:", err)
      await m.reply("❌ Terjadi kesalahan saat memproses perintah .play")
    }
  },
}
