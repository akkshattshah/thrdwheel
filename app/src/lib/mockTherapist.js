// A stand-in for the real shared AI. It is deliberately empathetic, reflective,
// and — crucially — it NEVER attributes anything to the partner. This mirrors
// the product's core promise so the MVP conveys the real feel.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function mockReply(text, { partnerName = "your partner" } = {}) {
  const t = text.toLowerCase();

  if (/(angry|mad|furious|pissed|annoyed|irritat|frustrat|rage)/.test(t)) {
    return pick([
      "that anger is telling you something matters to you. what felt threatened underneath it?",
      "sounds like a lot has built up. what would it look like to feel heard right now?",
      "it's okay to be angry. what do you wish had gone differently?",
    ]);
  }
  if (/(sad|hurt|cry|lonely|alone|down|depress|empty|numb)/.test(t)) {
    return pick([
      "i'm here with you. that sounds heavy — how long have you been carrying it?",
      "that hurts, and it's real. what do you need most in this moment?",
      "thank you for letting me sit in this with you. what would comfort look like tonight?",
    ]);
  }
  if (/(love|miss|happy|grateful|good|great|better|excited|proud)/.test(t)) {
    return pick([
      "i love hearing that. what made it feel that way?",
      "hold onto that. what would it take to have more moments like this?",
      "that's beautiful. how can you tell them a little of what you just told me?",
    ]);
  }
  if (/(fight|argu|yell|broke up|breakup|break up|split|leaving|distance)/.test(t)) {
    return pick([
      "conflict is normal — it's how you repair afterward that counts. what would repair look like for you?",
      "you don't have to solve all of it tonight. what's the one thing you'd want understood?",
      "when things cool down, what's the truest thing you'd want them to hear?",
    ]);
  }
  if (/(tell|told|said|say|know|find out|reveal|snitch|secret|private|trust)/.test(t)) {
    return pick([
      `just so you know: what you share here stays with you. i'll never repeat it to ${partnerName}.`,
      "this is your private space. i understand both of your worlds, but i never carry words between them.",
      "nothing you say here leaves this conversation. that's the whole point of me.",
    ]);
  }

  // Reflective fallback.
  return pick([
    "tell me more about that — what's underneath it for you?",
    "thank you for trusting me with that. how does it feel to say it out loud?",
    "i hear you. what would 'a little better' look like from here?",
    "that's worth sitting with. when did you first start noticing it?",
    "what do you think you needed in that moment that you didn't get?",
  ]);
}
