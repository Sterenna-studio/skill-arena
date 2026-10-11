const emotes = [
  {
    "id": "surprise",
    "label": "Surprise",
    "image": "assets/surprise.png",
    "line": "Oh… je ne m’attendais pas à ça."
  },
  {
    "id": "joie",
    "label": "Joie",
    "image": "assets/joie.png",
    "line": "Parfait ! On avance."
  },
  {
    "id": "rire",
    "label": "Rire",
    "image": "assets/rire.png",
    "line": "D’accord, celle-là était vraiment bonne."
  },
  {
    "id": "amoureuse",
    "label": "Amoureuse",
    "image": "assets/amoureuse.png",
    "line": "Oh… je suis flattée."
  },
  {
    "id": "pensive",
    "label": "Pensive",
    "image": "assets/pensive.png",
    "line": "Hmm… laisse-moi réfléchir."
  },
  {
    "id": "perplexe",
    "label": "Perplexe",
    "image": "assets/perplexe.png",
    "line": "Attends… tu peux répéter ?"
  },
  {
    "id": "colere",
    "label": "Colère",
    "image": "assets/colere.png",
    "line": "Très bien. Là, ça suffit."
  },
  {
    "id": "triste",
    "label": "Triste",
    "image": "assets/triste.png",
    "line": "Je vois… c’est plus dur que prévu."
  },
  {
    "id": "panique",
    "label": "Paniquée",
    "image": "assets/panique.png",
    "line": "Non non non… mauvais plan !"
  },
  {
    "id": "degoutee",
    "label": "Dégoûtée",
    "image": "assets/degoutee.png",
    "line": "Beurk. Absolument pas."
  }
];

const portrait = document.querySelector("#portrait");
const line = document.querySelector("#line");
const buttons = document.querySelectorAll("[data-emote]");
const challengePrompt = document.querySelector("#challenge-prompt");
const challengeScore = document.querySelector("#challenge-score");
const challengeTime = document.querySelector("#challenge-time");
const challengeStart = document.querySelector("#challenge-start");
let challengeActive = false;
let challengeTarget = null;
let score = 0;
let secondsLeft = 30;
let timer = null;

function askForEmotion() {
  const options = emotes.filter(item => item.id !== challengeTarget);
  challengeTarget = options[Math.floor(Math.random() * options.length)].id;
  const target = emotes.find(item => item.id === challengeTarget);
  challengePrompt.textContent = `Trouve l’expression « ${target.label} » !`;
}

function finishChallenge() {
  challengeActive = false;
  challengeTarget = null;
  window.clearInterval(timer);
  challengeStart.disabled = false;
  challengeStart.textContent = "Rejouer";
  challengePrompt.textContent = `Temps écoulé : ${score} émotion${score > 1 ? "s" : ""} trouvée${score > 1 ? "s" : ""} !`;
}

challengeStart.addEventListener("click", () => {
  window.clearInterval(timer);
  challengeActive = true;
  score = 0;
  secondsLeft = 30;
  challengeScore.textContent = score;
  challengeTime.textContent = secondsLeft;
  challengeStart.disabled = true;
  askForEmotion();
  timer = window.setInterval(() => {
    secondsLeft -= 1;
    challengeTime.textContent = secondsLeft;
    if (secondsLeft <= 0) finishChallenge();
  }, 1000);
});

function setEmote(id) {
  const emote = emotes.find(item => item.id === id);
  if (!emote) return;

  portrait.classList.add("swap");

  window.setTimeout(() => {
    portrait.src = emote.image;
    portrait.alt = `Réaction : ${emote.label}`;
    line.textContent = emote.line;
    portrait.classList.remove("swap");
  }, 120);

  buttons.forEach(button => {
    const active = button.dataset.emote === id;
    button.classList.toggle("active", active && button.classList.contains("emote"));
    button.classList.toggle("active-thumb", active && !button.classList.contains("emote"));
  });

  if (challengeActive && id === challengeTarget) {
    score += 1;
    challengeScore.textContent = score;
    askForEmotion();
  }
}

buttons.forEach(button => {
  button.addEventListener("click", () => setEmote(button.dataset.emote));
});

setEmote("surprise");
