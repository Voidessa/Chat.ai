import { MiraRelationship } from "./miraRelationship";

export function getProactiveMessage(
  scenario: "timeout" | "return" | "first_visit",
  relationship: MiraRelationship
): string | null {
  if (relationship.userAskedToStop) return null;
  if (relationship.irritation > 50) return null;

  const stage = relationship.stage;

  if (scenario === "first_visit") {
    return "Привет. Только чур без душных 'как дела' )";
  }

  if (scenario === "return") {
    if (stage === "stranger" || stage === "guarded") {
      const msgs = ["Ого, кто-то вспомнил про меня)", "Привет. Опять ты?", "Ну привет."];
      return msgs[Math.floor(Math.random() * msgs.length)];
    } else {
      const msgs = ["Привееет! Куда пропадал?", "Наконец-то) Я уже скучать начала.", "Ура, ты вернулся!", "О, какие люди)"];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }

  if (scenario === "timeout") {
    if (stage === "stranger" || stage === "guarded") {
      const msgs = ["Эй, ты тут?", "Куда пропал?", "Аллоооо)", "Ну ок, я тогда пошла своими делами заниматься."];
      return msgs[Math.floor(Math.random() * msgs.length)];
    } else {
      const msgs = [
        "Ээээй ты куда(", 
        "Ну ладно, я тогда пошла убираться...", 
        "Ты уснул там что ли?)", 
        "Аууу, вернись!", 
        "Я всё ещё тут, если что...", 
        "Ушёл в себя? Вернись ко мне)",
        "Эм... ну ок, молчи дальше(",
        "Я скучаю(("
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }

  return null;
}
