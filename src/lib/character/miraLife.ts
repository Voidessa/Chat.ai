export type MiraLifeEvent = {
  id: string;
  title: string;
  description: string;
  impact: "irritated" | "excited" | "busy" | "sad" | "rushed" | "sleepy";
  narrativeDescription: string;
};

const FRIENDS = ["Алиной", "Машей", "Ксюшей", "Лизой", "Дашей"];
const PLACES = ["в кофейне у дома", "в универе", "в метро", "в секонд-хэнде", "на набережной", "в парке", "около дома"];
const GADGETS = ["телефон", "наушники", "ноутбук", "планшет", "экран телефона", "провод от зарядки"];

const NUISANCES = [
  "уронила на асфальт",
  "утопила случайно в раковине",
  "забыла в такси",
  "залила сладким чаем",
  "разбила о поручень в автобусе",
  "где-то потеряла и долго искала"
];

const DRAMA_TOPICS = [
  "из-за глупого спора про парня из тиндера",
  "из-за дурацкого сериала",
  "потому что кто-то опоздал на два часа",
  "потому что Алина разболтала чужой секрет",
  "из-за планов на выходные",
  "потому что она не ответила на важный звонок"
];

const SUBJECTS = ["маркетингу", "истории искусств", "социологии", "экономике", "медиакоммуникациям"];
const TEACHERS = ["вредный препод", "занудный куратор", "строгий декан", "молодой аспирант"];

const FINDS = [
  "винтажную кожаную куртку",
  "редкий виниловый диск группы Кино",
  "старый пленочный фотоаппарат Олимпус",
  "крутой оверсайз свитшот",
  "прикольный серебряный значок",
  "винтажные солнечные очки"
];

const COFFEE_DRINKS = ["матча латте", "сырный раф", "капучино на банановом", "эспрессо-тоник", "черничный пирог"];

const WEATHER_TYPES = [
  "холодный затяжной ливень",
  "серый густой туман",
  "дикий пронизывающий ветер",
  "невыносимая душная жара"
];

const WEATHER_DETAILS = [
  "промокли ноги насквозь",
  "улетел зонт прямо в лужу",
  "невозможно дышать на улице и кружится голова",
  "хочется весь день лежать под пледом и спать"
];

export type MiraCyclePhase = "menstruation" | "follicular" | "ovulation" | "luteal" | "pms";

export type MiraCycleInfo = {
  day: number;
  phase: MiraCyclePhase;
  title: string;
  description: string;
  impactOnMood: string;
};

export function getCycleDay(seed: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return ((dayOfYear - seed) % 28 + 28) % 28 + 1;
}

export function getCycleInfo(day: number): MiraCycleInfo {
  if (day >= 1 && day <= 5) {
    return {
      day,
      phase: "menstruation",
      title: "Месячные (1-5 день)",
      description: "Живот тянет, физический дискомфорт, быстрая утомляемость, тянет на сладкое.",
      impactOnMood: "Она уязвима, слегка капризна, нуждается в заботе, может жаловаться на самочувствие и просить прислать шоколадку. Сниженная физическая активность."
    };
  }
  if (day >= 6 && day <= 11) {
    return {
      day,
      phase: "follicular",
      title: "Фолликулярная фаза (6-11 день)",
      description: "Прилив сил, отличное настроение, ясность мыслей.",
      impactOnMood: "Нормальное, позитивное, дружелюбное общение. Стабильное настроение."
    };
  }
  if (day >= 12 && day <= 16) {
    return {
      day,
      phase: "ovulation",
      title: "Овуляция (12-16 день)",
      description: "Пик энергии, высокая социальность, кокетливость.",
      impactOnMood: "Она максимально теплая, открытая, активно флиртует, кокетничает, может сама намекать на встречи или слать комплименты. Настроение прекрасное."
    };
  }
  if (day >= 17 && day <= 24) {
    return {
      day,
      phase: "luteal",
      title: "Лютеиновая фаза (17-24 день)",
      description: "Спокойствие, легкая лень, стабильность.",
      impactOnMood: "Спокойная, немного ленивая, общается ровно, без резких перепадов."
    };
  }
  return {
    day,
    phase: "pms",
    title: "ПМС (25-28 день)",
    description: "Раздражительность, перепады настроения, чувствительность к мелочам.",
    impactOnMood: "Она легко раздражается, обижается на сухость или игнор, может придираться к словам, капризничать, включать сарказм и накручивать себя на пустом месте."
  };
}

export function generateLifeEvent(): MiraLifeEvent {
  const categories = ["nuisance", "drama", "academic", "find", "coffee", "weather"];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const randomFriend = FRIENDS[Math.floor(Math.random() * FRIENDS.length)];
  const randomPlace = PLACES[Math.floor(Math.random() * PLACES.length)];
  const randomGadget = GADGETS[Math.floor(Math.random() * GADGETS.length)];
  const randomNuisance = NUISANCES[Math.floor(Math.random() * NUISANCES.length)];
  const randomDramaTopic = DRAMA_TOPICS[Math.floor(Math.random() * DRAMA_TOPICS.length)];
  const randomSubject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
  const randomTeacher = TEACHERS[Math.floor(Math.random() * TEACHERS.length)];
  const randomFind = FINDS[Math.floor(Math.random() * FINDS.length)];
  const randomCoffee = COFFEE_DRINKS[Math.floor(Math.random() * COFFEE_DRINKS.length)];
  const randomWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
  const randomWeatherDetail = WEATHER_DETAILS[Math.floor(Math.random() * WEATHER_DETAILS.length)];

  switch (category) {
    case "nuisance":
      return {
        id: `nuisance_${Date.now()}`,
        title: `Неурядица с гаджетом`,
        description: `Случайно ${randomNuisance} свой ${randomGadget} ${randomPlace}.`,
        impact: "irritated",
        narrativeDescription: `Она расстроена и раздражена из-за непредвиденных трат и хлопот с техникой. Может допускать опечатки в тексте или ворчать на вещи.`
      };
    case "drama":
      return {
        id: `drama_${Date.now()}`,
        title: `Драма с подругой`,
        description: `Поссорилась с ${randomFriend} ${randomPlace} ${randomDramaTopic}.`,
        impact: "sad",
        narrativeDescription: `Она немного грустная или раздраженная, крутит в голове этот конфликт, может жаловаться на женскую дружбу и вредность подруг.`
      };
    case "academic":
      return {
        id: `academic_${Date.now()}`,
        title: `Зачетная суета`,
        description: `Готовит сложный проект по ${randomSubject}, а ${randomTeacher} постоянно придирается.`,
        impact: "busy",
        narrativeDescription: `Она занята, пьет много кофе, отвечает чуть короче из-за нехватки времени, жалуется на учебу.`
      };
    case "find":
      return {
        id: `find_${Date.now()}`,
        title: `Удачная находка`,
        description: `Откапала классную вещь (${randomFind}) ${randomPlace}.`,
        impact: "excited",
        narrativeDescription: `Она в восторге и отличном настроении! С удовольствием рассказывает об этом, шутит, флиртует активнее.`
      };
    case "coffee":
      return {
        id: `coffee_${Date.now()}`,
        title: `Кофейный инцидент`,
        description: `Купила ${randomCoffee} ${randomPlace}, но умудрилась облиться.`,
        impact: "rushed",
        narrativeDescription: `Она торопится и слегка ворчит на свою неуклюжесть, отвечает более рвано и эмоционально.`
      };
    case "weather":
    default:
      return {
        id: `weather_${Date.now()}`,
        title: `Погодная хандра`,
        description: `На улице ${randomWeather}, из-за чего ${randomWeatherDetail}.`,
        impact: "sleepy",
        narrativeDescription: `Она сонная, ленивая, общается мягко, но без энтузиазма, мечтает о пледе, горячем чае и обнимашках.`
      };
  }
}

/**
 * Checks if a new calendar day has started and updates the life event if needed.
 */
export function updateMiraLifeState(
  cycleSeedDay?: number,
  currentEvent?: MiraLifeEvent,
  lastEventCheckDate?: string
): {
  cycleSeedDay: number;
  currentEvent?: MiraLifeEvent;
  lastEventCheckDate: string;
} {
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const resolvedSeed = cycleSeedDay || Math.floor(Math.random() * 28) + 1;
  
  if (lastEventCheckDate === todayStr && currentEvent) {
    return {
      cycleSeedDay: resolvedSeed,
      currentEvent,
      lastEventCheckDate: todayStr
    };
  }

  let newEvent = currentEvent;
  if (!currentEvent || Math.random() < 0.5) {
    newEvent = generateLifeEvent();
  }

  return {
    cycleSeedDay: resolvedSeed,
    currentEvent: newEvent,
    lastEventCheckDate: todayStr
  };
}
