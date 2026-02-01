import EventEmitter from "events";

class BotMonitor extends EventEmitter {
  constructor(bot, io) {
    super()
    this.bot = bot
    this.io = io
    this.stats = {
      messages: {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      users: {
        total: 0,
        active: 0,
        new: 0,
      },
      commands: {},
      groups: {
        total: 0,
        active: 0,
      },
      performance: {
        uptime: 0,
        memoryUsage: {},
        cpuUsage: 0,
      },
    }

    this.startTime = Date.now()
    this.messageBuffer = []
    this.userActivity = new Map()
    this.commandUsage = new Map()

    this.initializeMonitoring()
  }

  initializeMonitoring() {
    // Monitor bot events
    if (this.bot) {
      this.bot.on("message", (data) => this.handleMessage(data))
      this.bot.on("connection-update", (data) => this.handleConnectionUpdate(data))
      this.bot.on("command-executed", (data) => this.handleCommandExecution(data))
      this.bot.on("user-activity", (data) => this.handleUserActivity(data))
      this.bot.on("error", (error) => this.handleError(error))
    }

    // Start periodic monitoring
    this.startPeriodicMonitoring()

    // Monitor system resources
    this.startResourceMonitoring()
  }

  handleMessage(data) {
    // Update message statistics
    this.stats.messages.total++
    this.stats.messages.today++

    // Add to message buffer for real-time display
    this.messageBuffer.push({
      ...data,
      timestamp: new Date().toISOString(),
    })

    // Keep only last 1000 messages in buffer
    if (this.messageBuffer.length > 1000) {
      this.messageBuffer.shift()
    }

    // Update user activity
    this.updateUserActivity(data.sender)

    // Emit to dashboard
    this.io.to("admin-room").emit("new-message", data)
    this.io.to("admin-room").emit("bot-stats", {
      totalMessages: this.stats.messages.total,
      messagesToday: this.stats.messages.today,
    })

    this.emit("message-processed", data)
  }

  handleConnectionUpdate(data) {
    this.io.to("admin-room").emit("connection-status", data)

    if (data.isConnected) {
      this.emit("bot-connected")
    } else {
      this.emit("bot-disconnected")
    }
  }

  handleCommandExecution(data) {
    const command = data.command

    // Update command statistics
    if (!this.stats.commands[command]) {
      this.stats.commands[command] = 0
    }
    this.stats.commands[command]++

    // Update command usage map
    this.commandUsage.set(command, (this.commandUsage.get(command) || 0) + 1)

    // Emit to dashboard
    this.io.to("admin-room").emit("command-executed", {
      command: command,
      user: data.user,
      timestamp: new Date().toISOString(),
    })

    this.emit("command-executed", data)
  }

  handleUserActivity(data) {
    this.updateUserActivity(data.userId)

    // Update user statistics
    if (!this.userActivity.has(data.userId)) {
      this.stats.users.new++
    }

    this.emit("user-activity", data)
  }

  handleError(error) {
    console.error("[Monitor] Bot error:", error)

    // Emit error to dashboard
    this.io.to("admin-room").emit("system-alert", {
      type: "danger",
      message: `Bot error: ${error.message}`,
      timestamp: new Date().toISOString(),
    })

    this.emit("bot-error", error)
  }

  updateUserActivity(userId) {
    const now = Date.now()
    this.userActivity.set(userId, now)

    // Count active users (active in last 24 hours)
    const dayAgo = now - 24 * 60 * 60 * 1000
    let activeCount = 0

    for (const [user, lastActivity] of this.userActivity.entries()) {
      if (lastActivity > dayAgo) {
        activeCount++
      }
    }

    this.stats.users.active = activeCount
    this.stats.users.total = this.userActivity.size
  }

  startPeriodicMonitoring() {
    // Update statistics every minute
    this.statsInterval = setInterval(() => {
      this.updateStatistics()
    }, 60000)

    // Reset daily counters at midnight
    this.dailyResetInterval = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyCounters()
      }
    }, 60000)

    // Clean up old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData()
    }, 3600000)
  }

  startResourceMonitoring() {
    // Monitor system resources every 30 seconds
    this.resourceInterval = setInterval(() => {
      this.updateResourceMetrics()
    }, 30000)
  }

  updateStatistics() {
    const stats = this.getStatistics()

    // Emit updated statistics to dashboard
    this.io.to("admin-room").emit("bot-stats", stats)

    this.emit("stats-updated", stats)
  }

  updateResourceMetrics() {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    this.stats.performance = {
      uptime: uptime,
      memoryUsage: memoryUsage,
      cpuUsage: process.cpuUsage(),
    }

    // Check for high memory usage
    const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal
    if (memoryPercent > 0.8) {
      this.io.to("admin-room").emit("system-alert", {
        type: "warning",
        message: `High memory usage: ${Math.round(memoryPercent * 100)}%`,
        timestamp: new Date().toISOString(),
      })
    }

    // Emit performance data
    this.io.to("admin-room").emit("performance-update", {
      memory: memoryUsage,
      uptime: uptime,
      timestamp: new Date().toISOString(),
    })
  }

  resetDailyCounters() {
    this.stats.messages.today = 0
    this.stats.users.new = 0

    console.log("[Monitor] Daily counters reset")

    this.io.to("admin-room").emit("system-alert", {
      type: "info",
      message: "Daily statistics reset",
      timestamp: new Date().toISOString(),
    })
  }

  cleanupOldData() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // Clean up old user activity
    for (const [userId, lastActivity] of this.userActivity.entries()) {
      if (lastActivity < weekAgo) {
        this.userActivity.delete(userId)
      }
    }

    // Clean up old messages from buffer
    this.messageBuffer = this.messageBuffer.filter((msg) => new Date(msg.timestamp).getTime() > weekAgo)

    console.log("[Monitor] Old data cleaned up")
  }

  getStatistics() {
    return {
      messages: { ...this.stats.messages },
      users: { ...this.stats.users },
      commands: { ...this.stats.commands },
      groups: { ...this.stats.groups },
      performance: { ...this.stats.performance },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    }
  }

  getRecentMessages(limit = 50, offset = 0) {
    return this.messageBuffer
      .slice()
      .reverse()
      .slice(offset, offset + limit)
  }

  getTopCommands(limit = 10) {
    return Array.from(this.commandUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([command, count]) => ({ command, count }))
  }

  getActiveUsers(limit = 10) {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000

    return Array.from(this.userActivity.entries())
      .filter(([userId, lastActivity]) => lastActivity > dayAgo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, lastActivity]) => ({
        userId,
        lastActivity: new Date(lastActivity).toISOString(),
      }))
  }

  // Method to be called by bot instance
  logMessage(messageData) {
    this.handleMessage(messageData)
  }

  logCommand(commandData) {
    this.handleCommandExecution(commandData)
  }

  logUserActivity(userData) {
    this.handleUserActivity(userData)
  }

  // Cleanup method
  destroy() {
    if (this.statsInterval) clearInterval(this.statsInterval)
    if (this.dailyResetInterval) clearInterval(this.dailyResetInterval)
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)
    if (this.resourceInterval) clearInterval(this.resourceInterval)

    this.removeAllListeners()
  }
}

export default BotMonitor