export default {
  name: "tiktok",
  command: ["tiktok", "ttdl", "tt"],
  description: "Download video TikTok dari URL",
  category: "download",
  cooldown: 10,

  async execute(m, { sock, Api }) {
    try {
      const url = (m.text || "").trim()
      if (!/^https?:\/\//i.test(url) || !/tiktok\.com|vt\.tiktok\.com/i.test(url)) {
        return m.reply(
          "❗ Format:\n.tiktok <url>\nContoh:\n.tiktok https://vt.tiktok.com/xxxx"
        )
      }

      await m.react("📥")

      const res = await Api.neoxr("/tiktok", { url })
      
      if (!res?.status || !res?.data?.video) {
        return m.reply("❌ Gagal mengambil data TikTok.")
      }

      const data = res.data
       
      await m.reply(data.video, { caption: data.caption || '-' })
      await m.react("✅")
    } catch (e) {
      console.error("tiktok error:", e)
      await m.reply("❌ Terjadi kesalahan saat memproses TikTok.")
    }
  },
}