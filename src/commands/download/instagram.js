export default {
  name: "instagram",
  command: ["instagram", "ig"],
  description: "Download video Instagram dari URL (post/reels)",
  category: "download",
  cooldown: 10,

  async execute(m, { sock, Api }) {
    try {
      const url = (m.text || "").trim()
      if (!/^https?:\/\//i.test(url) || !/(instagram\.com|ig\.me)/i.test(url)) {
        return m.reply("❗ Format: .instagram <url instagram>\nContoh: .instagram https://www.instagram.com/reel/xxxx")
      }

      await m.react("📥")
       
      const res = await Api.neoxr("/ig", { url })
 
      if (!res?.status) {
        return m.reply("❌ Gagal mengunduh video Instagram.")
      }

      const data = res.data
      
      await m.reply(data[0].url, { caption: data.caption || '-' })
      await m.react("✅")
    } catch (e) {
      console.error("instagram error:", e)
      await m.reply("❌ Terjadi kesalahan saat mengunduh Instagram.")
    }
  },
}
