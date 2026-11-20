
require("dotenv").config();

const { Telegraf } = require("telegraf");
const db = require("./database");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// Create or update player
function getPlayer(ctx) {
  const id = String(ctx.from.id);

  db.prepare(`
    INSERT OR IGNORE INTO players (user_id, username)
    VALUES (?, ?)
  `).run(id, ctx.from.username || ctx.from.first_name);

  return db.prepare(
    "SELECT * FROM players WHERE user_id = ?"
  ).get(id);
}

// START
bot.start((ctx) => {
  getPlayer(ctx);

  ctx.reply(
    `🔥 WELCOME TO CODED CURRENCY

Your demo gaming wallet is ready!

💎 Use /balance to see your currency.
🎁 Use /daily to claim rewards.
🛒 Use /shop to view packages.
📜 Use /history to see transactions.

Let's get started!`
  );
});

// BALANCE
bot.command("balance", (ctx) => {
  const p = getPlayer(ctx);

  ctx.reply(
    `💰 YOUR GAME WALLET

💎 Currency: ${p.diamonds.toLocaleString()}
🪙 Coins: ${p.coins.toLocaleString()}
👑 VIP Level: ${p.vip}

🆔 Player ID: ${p.user_id}`
  );
});

// DAILY REWARD
bot.command("daily", (ctx) => {
  const p = getPlayer(ctx);
  const today = new Date().toISOString().slice(0, 10);

  if (p.last_daily === today) {
    return ctx.reply("❌ You've already claimed today's reward.");
  }

  const diamonds = 100;
  const coins = 5000;

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE players
      SET diamonds = diamonds + ?,
          coins = coins + ?,
          last_daily = ?
      WHERE user_id = ?
    `).run(diamonds, coins, today, p.user_id);

    db.prepare(`
      INSERT INTO transactions
      (user_id, type, diamonds, coins)
      VALUES (?, ?, ?, ?)
    `).run(p.user_id, "Daily reward", diamonds, coins);
  });

  update();

  ctx.reply(
    `🎉 DAILY REWARD CLAIMED!

💎 +${currency} Currency
🪙 +${coins} Coins

Come back tomorrow!`
  );
});

// SHOP
bot.command("shop", (ctx) => {
  ctx.reply(
    `🛒 DEMO CURRENCY SHOP

1. Starter Pack
💎 1,000,000,000 Currency

2. Pro Pack
💎 50,000,000,000 Currency

3. Elite Pack
💎 1,00,000,000,000 Currency

These are demo packages.
No real payment or game top-up is processed.`
  );
});

// TRANSACTION HISTORY
bot.command("history", (ctx) => {
  const p = getPlayer(ctx);

  const rows = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 10
  `).all(p.user_id);

  if (!rows.length) {
    return ctx.reply("No transactions yet.");
  }

  const history = rows.map((r) =>
    `${r.type}: +${r.diamonds} 💎 | +${r.coins} 🪙`
  ).join("\n");

  ctx.reply(`📜 TRANSACTION HISTORY\n\n${history}`);
});

// ADMIN COMMAND
// Usage: /addcurrency USER_ID DIAMONDS COINS
bot.command("addcurrency", (ctx) => {
  if (String(ctx.from.id) !== ADMIN_ID) {
    return ctx.reply("⛔ Admin access only.");
  }

  const args = ctx.message.text.trim().split(/\s+/);

  if (args.length !== 4) {
    return ctx.reply(
      "Usage:\n/addcurrency USER_ID DIAMONDS COINS"
    );
  }

  const [, userId, diamonds, coins] = args;
  const d = Number(diamonds);
  const c = Number(coins);

  if (
    !/^\d+$/.test(userId) ||
    !Number.isSafeInteger(d) ||
    !Number.isSafeInteger(c) ||
    d < 0 || c < 0 || (d === 0 && c === 0)
  ) {
    return ctx.reply("Invalid user ID or currency amount.");
  }

  const player = db.prepare(
    "SELECT user_id FROM players WHERE user_id = ?"
  ).get(userId);

  if (!player) {
    return ctx.reply("Player not found. They must start the bot first.");
  }

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE players
      SET diamonds = diamonds + ?,
          coins = coins + ?
      WHERE user_id = ?
    `).run(d, c, userId);

    db.prepare(`
      INSERT INTO transactions
      (user_id, type, diamonds, coins)
      VALUES (?, ?, ?, ?)
    `).run(userId, "Admin credit", d, c);
  });

  update();

  ctx.reply(`✅ DEMO CURRENCY ADDED

Player: ${userId}
💎 +${d} Diamonds
🪙 +${c} Coins`);
});

// HELP
bot.command("help", (ctx) => {
  ctx.reply(
    `/start - Start bot
/balance - Check wallet
/daily - Claim daily reward
/shop - View packages
/history - Transaction history
/help - Help menu`
  );
});

// START BOT
bot.launch();

console.log("CODED CURRENCY BOT IS ONLINE!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
    
