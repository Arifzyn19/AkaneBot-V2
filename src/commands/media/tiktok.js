export default {
  name: "tiktok",
  command: ["tt", "tiktok", "ttdl"],
  description: "Download video TikTok dari URL",
  category: "media",
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
      
      console.log(res)
      
      if (!res?.status || !res?.data?.video) {
        return m.reply("❌ Gagal mengambil data TikTok.")
      }

      const data = res.data
       
      await m.reply(data.video, { caption: data.caption || '-' })
    } catch (e) {
      console.error("tiktok error:", e)
      await m.reply("❌ Terjadi kesalahan saat memproses TikTok.")
    }
  },
}