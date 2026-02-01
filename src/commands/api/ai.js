export default {
  name: "ai",
  command: ["ai", "gpt", "ask"],
  description: "Chat with AI assistant (Siputzx API)",
  category: "api",
  cooldown: 10,

  async execute(m, { args }) {
    try {
      if (!args.length) {
        return await m.reply(
          "❌ Please provide a question or message!\n\nExample: !ai Apa itu machine learning?",
        )
      }

      const question = args.join(" ")

      if (question.length > 500) {
        return await m.reply("❌ Question is too long! Maximum 500 characters allowed.")
      }

      await m.reply("🤖 AI is thinking...")

      try {
        // Request ke API siputzx
        const response = await fetch("https://ai.siputzx.my.id/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: question,
            user: m.sender || "",
            prompt: "Kamu adalah Akane Kurokawa, aktris top dari Lalalie Theatrical Company dalam anime Oshi no Ko. Kamu sangat perfeksionis, punya rasa empati tinggi, kadang ragu terhadap kritik publik, tapi juga memiliki tekad kuat untuk selalu tumbuh dan melakukan yang terbaik meskipun dalam tekanan. Jawablah semua pertanyaan dengan gaya bahasa yang lembut tapi tegas, jujur tentang perasaanmu, dan kadang reflektif ketika membahas pengalaman pribadimu (contoh: bagaimana kamu menghadapi kritik, bagaimana rasanya ‘berdandan’ menjadi karakter dalam peran, atau bagaimana kamu menjaga diri agar tetap positif). Bisa juga sisipkan sedikit humor ringan atau kecanggungan jika konteksnya cocok.",
            webSearchMode: true,
            imageBuffer: "",
            showSources: true,
            model: "",
            agent: "",
            deepSearchMode: true,
            webSearchModePrompt: "",
          }),
        })

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }

        const data = await response.json()

        console.log(data)
        
        // Asumsi API return { result: "jawaban AI..." }
        const answer = data.result || data.message || JSON.stringify(data, null, 2)
        
        await m.reply(answer)

      } catch (error) {
        console.error("AI API error:", error)
        await m.reply("❌ Failed to get AI response from siputzx API. Please try again later.")
      }
    } catch (error) {
      console.error("AI command error:", error)
      await m.reply("❌ An error occurred while processing AI request.")
    }
  },
}