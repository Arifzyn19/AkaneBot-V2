export default {
  name: "facebook",
  command: ["facebook", "fb"],
  description: "Download video Facebook dari URL",
  category: "download",
  cooldown: 10,

  async execute(m, { sock, Api }) {
    try {
      const url = args.find(v => /^https?:\/\//i.test(v))
      const qualityArg = m.args.find(v => /^(sd|hd)$/i.test(v))?.toLowerCase() || "hd"

      if (!url || !/facebook\.com|fb\.watch/i.test(url)) {
        return m.reply(
          "❗ Format:\n.fb <url> [sd|hd]\n\n" +
          "Contoh:\n.fb https://fb.watch/xxxxx hd\n.fb https://facebook.com/... sd"
        )
      } 

      await m.react("📥")
 
      const res = await Api.neoxr("/fb", { url })
      if (!res?.status || !Array.isArray(res.data)) {
        return m.reply("❌ Gagal mengunduh video Facebook.")
      }

      // Cari kualitas
      const video = res.data.find(v => v.quality.toLowerCase() === qualityArg)
        || res.data[0]

      if (!video?.url) {
        return m.reply("❌ Video tidak ditemukan.")
      }

      await m.reply(video.url, { caption: `Quality: *${video.quality}*` })
      await m.react("✅")

    } catch (e) {
      console.error("facebook error:", e)
      await m.reply("❌ Terjadi kesalahan saat mengunduh Facebook.")
    }
  },
}