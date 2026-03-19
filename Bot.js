const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const axios = require("axios");

// ====== CONFIG ======
const TOKEN = "8682235492:AAGqaHq9HK0hq2_8JKEhAI1PbivBl1g8KwA";
const ADMIN = 7004552573;

const API_URL = "https://smmglobe.com/api/v2";
const API_KEY = "25736852aa1d4abf42bdd2aa7caba51b";
const SERVICE_ID = 4408;

// ====================

const bot = new TelegramBot(TOKEN);
const app = express();
app.use(express.json());

let users = {};
let pending = {};

// ===== WEBHOOK =====
app.post("/bot", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(3000, () => console.log("Bot running..."));

// ===== USER FUNCTION =====
function getUser(id) {
  if (!users[id]) {
    users[id] = {
      credit: 0,
      referred: false,
      history: []
    };
  }
  return users[id];
}

// ===== START =====
bot.onText(/\/start (.+)?/, (msg, match) => {
  let id = msg.chat.id;
  let ref = match[1];

  let user = getUser(id);

  // referral
  if (ref && !user.referred && users[ref]) {
    user.credit += 50;
    user.referred = true;

    bot.sendMessage(id, "🎁 50 Credits Added (Referral Bonus)");
  }

  bot.sendMessage(id,
`🔥 REACTION BOT 🔥

💎 1 CREDIT = 1 REACTION

Choose option`,
{
reply_markup:{
keyboard:[
["⚡ INSTANT REACTION"],
["💰 ADD CREDIT","💳 CHECK BALANCE"],
["🎁 REFER","👑 ADMIN"]
],
resize_keyboard:true
}
});
});

// ===== INSTANT =====
bot.onText(/⚡ INSTANT REACTION/, (msg) => {
  pending[msg.chat.id] = { step: 1 };

  bot.sendMessage(msg.chat.id,
"📩 Send your post link or forward post");
});

// ===== STEP SYSTEM =====
bot.on("message", async (msg) => {

let id = msg.chat.id;
let text = msg.text;

if (!pending[id]) return;

let user = getUser(id);

// STEP 1
if (pending[id].step === 1) {
  pending[id].link = text;
  pending[id].step = 2;

  bot.sendMessage(id,
"Enter quantity (Min 10)");
}

// STEP 2
else if (pending[id].step === 2) {

let qty = parseInt(text);

if (qty < 10) {
  return bot.sendMessage(id, "❌ Minimum 10 required");
}

if (user.credit < qty) {
  return bot.sendMessage(id, "❌ Not enough credit");
}

// ===== API CALL =====
try {

let res = await axios.post(API_URL, {
  key: API_KEY,
  action: "add",
  service: SERVICE_ID,
  link: pending[id].link,
  quantity: qty
});

user.credit -= qty;

user.history.push({
  qty: qty,
  link: pending[id].link,
  time: new Date().toLocaleString()
});

bot.sendMessage(id,
`✅ ORDER SUCCESS

🔥 ${qty} Reactions Sent

💰 Remaining: ${user.credit}`);

} catch (e) {
  bot.sendMessage(id,"❌ API Error");
}

delete pending[id];
}

});

// ===== BALANCE =====
bot.onText(/💳 CHECK BALANCE/, (msg) => {
let user = getUser(msg.chat.id);

bot.sendMessage(msg.chat.id,
`💰 Balance: ${user.credit} Credits`);
});

// ===== ADD CREDIT =====
bot.onText(/💰 ADD CREDIT/, (msg) => {
bot.sendMessage(msg.chat.id,
`💳 ADD CREDIT

Contact Admin:
@INPUT03`);
});

// ===== REFER =====
bot.onText(/🎁 REFER/, (msg) => {

let id = msg.chat.id;

bot.sendMessage(id,
`🎁 REFER & EARN

Invite link:

https://t.me/YOUR_BOT_USERNAME?start=${id}

Earn 50 credits per user`);
});

// ===== ADMIN BUTTON =====
bot.onText(/👑 ADMIN/, (msg) => {
bot.sendMessage(msg.chat.id,
"👑 ADMIN\n@INPUT03");
});

// ================= ADMIN COMMANDS =================

// ADD CREDIT
bot.onText(/\/addcredit (.+)/, (msg, match) => {

if (msg.from.id != ADMIN) return;

let [id, amount] = match[1].split(" ");

getUser(id).credit += parseInt(amount);

bot.sendMessage(msg.chat.id,"✅ Credit Added");
});

// REMOVE CREDIT
bot.onText(/\/removecredit (.+)/, (msg, match) => {

if (msg.from.id != ADMIN) return;

let [id, amount] = match[1].split(" ");

getUser(id).credit -= parseInt(amount);

bot.sendMessage(msg.chat.id,"❌ Credit Removed");
});

// CHECK USER
bot.onText(/\/check (.+)/, (msg, match) => {

if (msg.from.id != ADMIN) return;

let user = getUser(match[1]);

bot.sendMessage(msg.chat.id,
`User Credit: ${user.credit}`);
});

// USERS
bot.onText(/\/users/, (msg) => {

if (msg.from.id != ADMIN) return;

bot.sendMessage(msg.chat.id,
`Total Users: ${Object.keys(users).length}`);
});

// BROADCAST
bot.onText(/\/broadcast (.+)/, (msg, match) => {

if (msg.from.id != ADMIN) return;

Object.keys(users).forEach(id => {
  bot.sendMessage(id, match[1]).catch(()=>{});
});

bot.sendMessage(msg.chat.id,"✅ Broadcast Done");
});
