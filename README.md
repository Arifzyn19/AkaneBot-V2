# 🤖 WhatsApp Bot

WhatsApp Bot menggunakan Baileys dengan sistem command modular dan dual storage (MongoDB/JSON).

## ✨ Features

- 🔌 **Multi-platform**: Baileys untuk koneksi WhatsApp
- 🗄️ **Dual Storage**: MongoDB atau JSON local storage
- 🎯 **Modular Commands**: Auto-loader untuk command system
- 🔐 **Permission System**: User, Admin, Owner levels
- ⏱️ **Cooldown System**: Rate limiting untuk commands
- 🔄 **Auto Reconnect**: Otomatis reconnect jika terputus
- 📱 **QR Code**: Support QR Code dan Pairing Code

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/Arifzyn19/Akane-Bot-V2 whatsapp-bot
cd whatsapp-bot

# Install dependencies
npm install

# Copy dan edit environment file
cp .env.example .env
nano .env

# Start bot
npm start
```

## 🔧 Configuration

Edit file `.env`:

```env
# Database Mode: mongodb atau json
DB_MODE=json

# MongoDB URI (jika menggunakan MongoDB)
MONGO_URI=mongodb://localhost:27017/whatsapp-bot

# Bot Configuration
BOT_NAME=WhatsApp Bot
PREFIX=!
OWNER_NUMBER=62812345678901
ADMIN_NUMBERS=62812345678901,62812345678902

# Bot Options
AUTO_RECONNECT=true
PRINT_QR=true
USE_PAIRING_CODE=false
PAIRING_NUMBER=62812345678901
```

## 📁 Project Structure

```
whatsapp-bot/
│── src/
│   ├── commands/              # Bot commands
│   │   ├── general/           # General commands
│   │   │   ├── menu.js        # Command list
│   │   │   └── ping.js        # Ping test
│   │   └── admin/             # Admin commands
│   │       └── shutdown.js    # Bot shutdown
│   │
│   ├── config/                # Configuration
│   │   ├── db.js              # Database connection
│   │   ├── storage.js         # Storage adapter
│   │   └── env.js             # Environment config
│   │
│   ├── lib/                   # Core libraries
│   │   ├── baileys.js         # WhatsApp client
│   │   ├── commandLoader.js   # Command loader
│   │   └── utils.js           # Utility functions
│   │
│   ├── services/              # Services
│   │   └── messageHandler.js  # Message handler
│   │
│   ├── main.js                # Main bot class
│   └── index.js               # Entry point
│
├── .env.example               # Environment template
├── package.json
└── README.md
```

## 🎯 Commands

### General Commands

- `!menu` - Tampilkan daftar commands
- `!ping` - Test response time
- `!status` - Bot status dan system info
- `!connect` - Connection information
- `!test` - Test enhanced client features
- `!poll` - Create polls in groups
- `!download` - Download media from quoted messages

### Admin Commands

- `!shutdown` - Matikan bot (Admin only)
- `!reload` - Reload commands (Admin only)

### Owner Commands

- `!eval` - Execute JavaScript code (Owner only)

## 🔧 Advanced Plugin System

### Hot Reload Features

- **File Watching**: Otomatis detect perubahan file plugin
- **Syntax Validation**: Check syntax error sebelum load
- **Live Updates**: Update plugin tanpa restart bot
- **Error Handling**: Plugin dengan error tidak crash bot
- **Multi Format**: Support .js, .mjs, .cjs files

### Plugin Structure

File plugin harus export default object dengan struktur:

```javascript
export default {
  name: "commandname",
  description: "Command description",
  usage: "!commandname [args]",
  category: "general",
  aliases: ["alias1", "alias2"], // optional
  permissions: ["user"], // user|admin|owner
  cooldown: 5, // optional (seconds)

  execute: async (sock, context) => {
    // Plugin logic here
    const { msg, args, user, bot, plugins } = context;
    await msg.reply("Hello World!");
  },
};
```

### Context Object

Plugin receive rich context object:

- `msg` - Enhanced message object dengan methods
- `args` - Command arguments array
- `user` - User data dengan permissions
- `bot` - Bot configuration
- `plugins` - Array semua loaded plugins
- `pluginStats` - Plugin loader statistics
- `isOwner/isAdmin` - Permission shortcuts
- `quoted` - Quoted message object
- `isMedia` - Media detection boolean

### Development Tips

- Edit plugin files akan otomatis reload
- Syntax error ditampilkan di console
- Gunakan `!pluginstats` untuk monitor
- Test dengan `!reload` jika perlu force reload

## 🗄️ Database Modes

### JSON Mode (Default)

- Data disimpan di `src/models/json/`
- Tidak perlu setup database
- Cocok untuk development

### MongoDB Mode

- Perlu MongoDB server
- Set `DB_MODE=mongodb` di `.env`
- Set `MONGO_URI` dengan connection string MongoDB

## 🔐 Permission System

- **user**: Semua pengguna
- **admin**: Admin yang didefinisikan di `ADMIN_NUMBERS`
- **owner**: Owner yang didefinisikan di `OWNER_NUMBER`

## 🚀 Development

```bash
# Development mode dengan auto-restart
npm run dev

# Production mode
npm start
```

## 📝 Logging

Bot menggunakan Pino untuk logging dengan level:

- `error`: Error messages
- `warn`: Warning messages
- `info`: Info messages (default)
- `debug`: Debug messages

## 🛡️ Error Handling

- Auto reconnect jika koneksi terputus
- Graceful shutdown dengan cleanup
- Error logging untuk debugging
- Cooldown protection untuk spam

## 📱 WhatsApp Connection

Bot mendukung dua metode koneksi:

1. **QR Code** (Default): Scan QR code dengan WhatsApp
2. **Pairing Code**: Gunakan kode pairing (set `USE_PAIRING_CODE=true`)

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## 📄 License

MIT License

## 🆘 Support

Jika menemukan bug atau butuh bantuan:

1. Buat issue di GitHub
2. Sertakan log error
3. Jelaskan langkah untuk reproduce

---

Made with ❤️ using Baileys
