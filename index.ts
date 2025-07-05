import { Client, ForumChannel, GatewayIntentBits, Partials } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const serverId = '1183243037430796339';
const forumId = '1372428934737563759';
const pingId = '1390741938453348422';

const MILLIS_IN_A_DAY = 24 * 60 * 60 * 1000;
const REMIND_AFTER_DAYS = 2;
const REMIND_AFTER_MILLIS = REMIND_AFTER_DAYS * MILLIS_IN_A_DAY;

async function checkForumInactivity() {
  const now = Date.now();
  for (const guild of bot.guilds.cache.values()) {
    if (guild.id !== serverId) {
      continue;
    }
    for (const channel of guild.channels.cache.values()) {
      if (channel.id !== forumId) {
        continue;
      }
      const forum = channel as ForumChannel;
      const active = await forum.threads.fetchActive();
      const pendingTag = forum.availableTags.find(tag => tag.name.toLowerCase() === 'pending');
      if (!pendingTag) {
        throw new Error(`Pending tag not found in ${forum.name}`);
      }
      for (const thread of active.threads.values()) {
        if (!thread.appliedTags.includes(pendingTag.id)) {
          continue;
        }
        let reminder = `<@&${pingId}> Take a look at this thread, it's been inactive for a while :dread:`;
        await thread.messages.fetch({ limit: 1 });
        const lastMessage = thread.lastMessage;
        if (!lastMessage) {
          if (now - thread.createdTimestamp! >= REMIND_AFTER_MILLIS) {
            await thread.send(reminder);
          }
          continue;
        }
        if (now - lastMessage.createdTimestamp >= REMIND_AFTER_MILLIS) {
          await thread.send(reminder);
        }
      }
    }
  }
}

bot.once('ready', async () => {
  console.log(`✅ Logged in as ${bot.user!.tag}`);
  try {
    await checkForumInactivity();
    console.log('🔔 Reminders sent, shutting down.');
  } catch (err) {
    console.error('❌ Error during inactivity check:', err);
  } finally {
    await bot.destroy();
    process.exit(0);
  }
});

bot.login(DISCORD_BOT_TOKEN);
