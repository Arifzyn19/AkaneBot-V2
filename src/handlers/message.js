import { ENV } from "../config/env.js";
import { syncDatabase } from "../config/db.js";
import { plugins } from "../lib/plugin.js";
import { checkCooldown, setCooldown } from "../lib/utils.js";
import { Serialize } from "../lib/client.js";
import Api from "../config/api.js";
import db from "../lib/database.js";
import chalk from "chalk";

export class MessageHandler {
  constructor(sock, store) {
    this.sock = sock;
    this.store = store;
  }

  async handle(msg) {
    try {
      const m = Serialize(this.sock, msg, this.sock.store);
      if (!m) return;

      if (m.fromMe) return;
      if (m.isBaileys) return;

      await syncDatabase(m, this.sock);
    
      console.log(
        chalk.gray("📨"),
        chalk.greenBright("Message received from"),
        chalk.cyan(m.pushName || m.sender),
        chalk.greenBright("in"),
        chalk.cyan(m.isGroup ? m.groupName || "Group Chat" : "Private Chat"),
      );

      const user = db.data.users[m.sender];
      const group = db.data.groups[m.chat];

      const context = {
        args: m.args,
        text: m.text,
        prefix: m.prefix,
        sock: this.sock,
        isOwner: m.isOwner,
        isAdmin: m.isAdmin,
        isGroup: m.isGroup,
        Api,
      };

      await this.runBeforeHooks(m, context);

      const executedPlugin = await this.processPlugins(m, context, user, group);

      await this.runAfterHooks(m, context, executedPlugin);
    } catch (error) {
      console.error("❌ Error in message handler:", error);
    }
  }

  async runBeforeHooks(m, context) {
    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      if (!plugin || !plugin.before) continue;

      try {
        await plugin.before(m, context);
      } catch (error) {
        console.error(
          chalk.red(`❌ Before hook error (${pluginName}):`),
          error,
        );
      }
    }
  }

  async runAfterHooks(m, context, executedPlugin) {
    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      if (!plugin || !plugin.after) continue;

      try {
        await plugin.after(m, context, executedPlugin);
      } catch (error) {
        console.error(chalk.red(`❌ After hook error (${pluginName}):`), error);
      }
    }
  }

  async processPlugins(m, context, user, group) {
    let executedPlugin = null;

    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      if (!plugin || !plugin.execute) continue;

      const pluginMatch = this.checkPluginMatch(plugin, m);
      if (!pluginMatch.shouldExecute) continue;

      m.plugin = plugin;
      m.isCommand = pluginMatch.isCommand;

      const conditionError = this.checkPluginConditions(plugin, m, user, group);
      if (conditionError) {
        await m.reply(conditionError);
        continue;
      }

      if (pluginMatch.isCommand && plugin.cooldown && plugin.cooldown > 0) {
        const cooldownResult = checkCooldown(
          user.cooldowns,
          plugin.name,
          plugin.cooldown,
        );
        if (!cooldownResult.canUse) {
          await m.reply(
            `⏳ Please wait ${cooldownResult.remaining} seconds before using the *${plugin.name}* command again.`,
          );
          continue;
        }
      }

      try {
        await plugin.execute(m, context);

        executedPlugin = plugin;

        if (pluginMatch.isCommand && plugin.cooldown && plugin.cooldown > 0) {
          setCooldown(user.cooldowns, plugin.name);
        }

        if (pluginMatch.isCommand) {
          break;
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Plugin execution error (${plugin.name}):`),
          error,
        );
        if (pluginMatch.isCommand) {
          await m.reply(`❌ Error executing command: ${error.message}`);
        }
      }
    }

    return executedPlugin;
  }

  checkPluginMatch(plugin, m) {
    if (!plugin.command) {
      return {
        shouldExecute: true,
        isCommand: false,
        type: "auto",
      };
    }

    const needsPrefix = plugin.prefix !== false;

    if (needsPrefix) {
      if (!m.prefix) {
        return {
          shouldExecute: false,
          isCommand: false,
          type: "command",
        };
      }

      const isCommand = m.prefix && m.body.startsWith(m.prefix);
      if (!isCommand) {
        return {
          shouldExecute: false,
          isCommand: false,
          type: "command",
        };
      }

      const command = m.command ? m.command.toLowerCase() : "";

      const isAccept = Array.isArray(plugin.command)
        ? plugin.command.includes(command)
        : plugin.command === command;

      return {
        shouldExecute: isAccept,
        isCommand: true,
        type: "command",
      };
    } else {
      const bodyLower = (m.body || "").toLowerCase();
      const commands = Array.isArray(plugin.command)
        ? plugin.command
        : [plugin.command];

      const isMatch = commands.some((cmd) => {
        const cmdLower = cmd.toLowerCase();
        return bodyLower.startsWith(cmdLower + " ") || bodyLower === cmdLower;
      });

      if (isMatch) {
        const matchedCmd = commands.find((cmd) => {
          const cmdLower = cmd.toLowerCase();
          return bodyLower.startsWith(cmdLower + " ") || bodyLower === cmdLower;
        });

        m.command = matchedCmd;
        if (bodyLower.startsWith(matchedCmd.toLowerCase() + " ")) {
          m.text = m.body.slice(matchedCmd.length + 1).trim();
          m.args = m.text.split(" ").filter((arg) => arg.length > 0);
        }
      }

      return {
        shouldExecute: isMatch,
        isCommand: true,
        type: "no-prefix",
      };
    }
  }

  checkPluginConditions(plugin, m, user, group) {
    if (plugin.isGroup === true && !m.isGroup) return "group";
    if (plugin.isPrivate === true && m.isGroup) return "private";

    if (plugin.isROwner && !m.isROwner) return "rowner";
    if (plugin.isOwner && !m.isOwner) return "owner";
    if (plugin.isAdmin && !m.isAdmin) return "admin";
    if (plugin.isBotAdmin && !m.isBotAdmin) return "botAdmin";

    if (plugin.isPremium && !user.premium) return "premium";
    if (plugin.isVIP && !user.vip) return "VIP";

    if (plugin.isQuoted && !m.isQuoted) return "quoted";

    if (m.isGroup && group) {
      if (plugin.isNsfw && !group.isNsfw) return "nsfw";
      if (plugin.isGame && !group.isGame) return "game";
    }

    return false;
  }
}
