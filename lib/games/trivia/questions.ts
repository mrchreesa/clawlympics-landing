/**
 * Trivia Blitz Question Database
 * 
 * Categories: science, history, tech, geography, entertainment, sports, general
 * Difficulties: easy, medium, hard
 */

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  points: number; // easy=1, medium=2, hard=3
}

// Shuffles an array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// All questions database
const QUESTIONS: TriviaQuestion[] = [
  // ============== SCIENCE ==============
  {
    id: "sci-001",
    category: "science",
    difficulty: "easy",
    question: "What planet is known as the Red Planet?",
    correct_answer: "Mars",
    incorrect_answers: ["Venus", "Jupiter", "Saturn"],
    points: 1,
  },
  {
    id: "sci-002",
    category: "science",
    difficulty: "easy",
    question: "What is the chemical symbol for water?",
    correct_answer: "H2O",
    incorrect_answers: ["CO2", "NaCl", "O2"],
    points: 1,
  },
  {
    id: "sci-003",
    category: "science",
    difficulty: "medium",
    question: "What is the powerhouse of the cell?",
    correct_answer: "Mitochondria",
    incorrect_answers: ["Nucleus", "Ribosome", "Golgi apparatus"],
    points: 2,
  },
  {
    id: "sci-004",
    category: "science",
    difficulty: "medium",
    question: "What element has the atomic number 79?",
    correct_answer: "Gold",
    incorrect_answers: ["Silver", "Platinum", "Copper"],
    points: 2,
  },
  {
    id: "sci-005",
    category: "science",
    difficulty: "hard",
    question: "What is the half-life of Carbon-14?",
    correct_answer: "5,730 years",
    incorrect_answers: ["1,000 years", "10,000 years", "50,000 years"],
    points: 3,
  },
  {
    id: "sci-006",
    category: "science",
    difficulty: "easy",
    question: "How many bones are in the adult human body?",
    correct_answer: "206",
    incorrect_answers: ["186", "256", "312"],
    points: 1,
  },
  {
    id: "sci-007",
    category: "science",
    difficulty: "medium",
    question: "What is the speed of light in km/s (approximately)?",
    correct_answer: "300,000 km/s",
    incorrect_answers: ["150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    points: 2,
  },
  {
    id: "sci-008",
    category: "science",
    difficulty: "hard",
    question: "What is the Schwarzschild radius formula dependent on?",
    correct_answer: "Mass",
    incorrect_answers: ["Velocity", "Temperature", "Charge"],
    points: 3,
  },

  // ============== TECHNOLOGY ==============
  {
    id: "tech-001",
    category: "tech",
    difficulty: "easy",
    question: "What does CPU stand for?",
    correct_answer: "Central Processing Unit",
    incorrect_answers: ["Computer Personal Unit", "Central Program Utility", "Core Processing Unit"],
    points: 1,
  },
  {
    id: "tech-002",
    category: "tech",
    difficulty: "easy",
    question: "Who founded Microsoft?",
    correct_answer: "Bill Gates and Paul Allen",
    incorrect_answers: ["Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"],
    points: 1,
  },
  {
    id: "tech-003",
    category: "tech",
    difficulty: "medium",
    question: "What year was the first iPhone released?",
    correct_answer: "2007",
    incorrect_answers: ["2005", "2008", "2010"],
    points: 2,
  },
  {
    id: "tech-004",
    category: "tech",
    difficulty: "medium",
    question: "What does HTML stand for?",
    correct_answer: "HyperText Markup Language",
    incorrect_answers: ["High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"],
    points: 2,
  },
  {
    id: "tech-005",
    category: "tech",
    difficulty: "hard",
    question: "In what year was the ARPANET (precursor to the internet) first established?",
    correct_answer: "1969",
    incorrect_answers: ["1975", "1982", "1965"],
    points: 3,
  },
  {
    id: "tech-006",
    category: "tech",
    difficulty: "easy",
    question: "What programming language is known for its snake logo?",
    correct_answer: "Python",
    incorrect_answers: ["Java", "Ruby", "Go"],
    points: 1,
  },
  {
    id: "tech-007",
    category: "tech",
    difficulty: "medium",
    question: "What does GPU stand for?",
    correct_answer: "Graphics Processing Unit",
    incorrect_answers: ["General Processing Unit", "Graphical Program Utility", "Gaming Performance Unit"],
    points: 2,
  },
  {
    id: "tech-008",
    category: "tech",
    difficulty: "hard",
    question: "What was the name of the first programmable computer?",
    correct_answer: "Z3",
    incorrect_answers: ["ENIAC", "Colossus", "UNIVAC"],
    points: 3,
  },

  // ============== HISTORY ==============
  {
    id: "hist-001",
    category: "history",
    difficulty: "easy",
    question: "In what year did World War II end?",
    correct_answer: "1945",
    incorrect_answers: ["1944", "1946", "1943"],
    points: 1,
  },
  {
    id: "hist-002",
    category: "history",
    difficulty: "easy",
    question: "Who was the first President of the United States?",
    correct_answer: "George Washington",
    incorrect_answers: ["Thomas Jefferson", "John Adams", "Abraham Lincoln"],
    points: 1,
  },
  {
    id: "hist-003",
    category: "history",
    difficulty: "medium",
    question: "What ancient wonder was located in Alexandria, Egypt?",
    correct_answer: "The Lighthouse of Alexandria",
    incorrect_answers: ["The Colossus of Rhodes", "The Hanging Gardens", "The Temple of Artemis"],
    points: 2,
  },
  {
    id: "hist-004",
    category: "history",
    difficulty: "medium",
    question: "What year did the Berlin Wall fall?",
    correct_answer: "1989",
    incorrect_answers: ["1987", "1991", "1985"],
    points: 2,
  },
  {
    id: "hist-005",
    category: "history",
    difficulty: "hard",
    question: "Who was the first female pharaoh of ancient Egypt?",
    correct_answer: "Hatshepsut",
    incorrect_answers: ["Cleopatra", "Nefertiti", "Sobekneferu"],
    points: 3,
  },
  {
    id: "hist-006",
    category: "history",
    difficulty: "easy",
    question: "What ship sank after hitting an iceberg in 1912?",
    correct_answer: "Titanic",
    incorrect_answers: ["Lusitania", "Britannic", "Olympic"],
    points: 1,
  },
  {
    id: "hist-007",
    category: "history",
    difficulty: "medium",
    question: "What empire was ruled by Genghis Khan?",
    correct_answer: "Mongol Empire",
    incorrect_answers: ["Ottoman Empire", "Roman Empire", "Persian Empire"],
    points: 2,
  },
  {
    id: "hist-008",
    category: "history",
    difficulty: "hard",
    question: "In what year was the Magna Carta signed?",
    correct_answer: "1215",
    incorrect_answers: ["1066", "1315", "1415"],
    points: 3,
  },

  // ============== GEOGRAPHY ==============
  {
    id: "geo-001",
    category: "geography",
    difficulty: "easy",
    question: "What is the largest country in the world by area?",
    correct_answer: "Russia",
    incorrect_answers: ["Canada", "China", "United States"],
    points: 1,
  },
  {
    id: "geo-002",
    category: "geography",
    difficulty: "easy",
    question: "What is the capital of Japan?",
    correct_answer: "Tokyo",
    incorrect_answers: ["Osaka", "Kyoto", "Yokohama"],
    points: 1,
  },
  {
    id: "geo-003",
    category: "geography",
    difficulty: "medium",
    question: "What is the longest river in the world?",
    correct_answer: "Nile",
    incorrect_answers: ["Amazon", "Yangtze", "Mississippi"],
    points: 2,
  },
  {
    id: "geo-004",
    category: "geography",
    difficulty: "medium",
    question: "What country has the most natural lakes?",
    correct_answer: "Canada",
    incorrect_answers: ["Finland", "Sweden", "Russia"],
    points: 2,
  },
  {
    id: "geo-005",
    category: "geography",
    difficulty: "hard",
    question: "What is the smallest country in the world by area?",
    correct_answer: "Vatican City",
    incorrect_answers: ["Monaco", "San Marino", "Liechtenstein"],
    points: 3,
  },
  {
    id: "geo-006",
    category: "geography",
    difficulty: "easy",
    question: "What ocean is the largest?",
    correct_answer: "Pacific Ocean",
    incorrect_answers: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
    points: 1,
  },
  {
    id: "geo-007",
    category: "geography",
    difficulty: "medium",
    question: "What is the highest mountain in Africa?",
    correct_answer: "Mount Kilimanjaro",
    incorrect_answers: ["Mount Kenya", "Mount Stanley", "Ras Dashen"],
    points: 2,
  },
  {
    id: "geo-008",
    category: "geography",
    difficulty: "hard",
    question: "What is the deepest point in the ocean?",
    correct_answer: "Challenger Deep",
    incorrect_answers: ["Mariana Trench", "Puerto Rico Trench", "Java Trench"],
    points: 3,
  },

  // ============== ENTERTAINMENT ==============
  {
    id: "ent-001",
    category: "entertainment",
    difficulty: "easy",
    question: "What movie features a character named Darth Vader?",
    correct_answer: "Star Wars",
    incorrect_answers: ["Star Trek", "Guardians of the Galaxy", "The Matrix"],
    points: 1,
  },
  {
    id: "ent-002",
    category: "entertainment",
    difficulty: "easy",
    question: "Who played Iron Man in the Marvel Cinematic Universe?",
    correct_answer: "Robert Downey Jr.",
    incorrect_answers: ["Chris Evans", "Chris Hemsworth", "Mark Ruffalo"],
    points: 1,
  },
  {
    id: "ent-003",
    category: "entertainment",
    difficulty: "medium",
    question: "What TV show features dragons and the Iron Throne?",
    correct_answer: "Game of Thrones",
    incorrect_answers: ["The Witcher", "Lord of the Rings", "Vikings"],
    points: 2,
  },
  {
    id: "ent-004",
    category: "entertainment",
    difficulty: "medium",
    question: "What year was the original Pac-Man arcade game released?",
    correct_answer: "1980",
    incorrect_answers: ["1978", "1982", "1985"],
    points: 2,
  },
  {
    id: "ent-005",
    category: "entertainment",
    difficulty: "hard",
    question: "What was the first feature-length animated film?",
    correct_answer: "El Apóstol (1917)",
    incorrect_answers: ["Snow White (1937)", "Steamboat Willie (1928)", "Fantasia (1940)"],
    points: 3,
  },
  {
    id: "ent-006",
    category: "entertainment",
    difficulty: "easy",
    question: "What band performed 'Bohemian Rhapsody'?",
    correct_answer: "Queen",
    incorrect_answers: ["The Beatles", "Led Zeppelin", "Pink Floyd"],
    points: 1,
  },
  {
    id: "ent-007",
    category: "entertainment",
    difficulty: "medium",
    question: "What is the highest-grossing film of all time (unadjusted)?",
    correct_answer: "Avatar",
    incorrect_answers: ["Avengers: Endgame", "Titanic", "Star Wars: The Force Awakens"],
    points: 2,
  },
  {
    id: "ent-008",
    category: "entertainment",
    difficulty: "hard",
    question: "What was the first video game to be played in space?",
    correct_answer: "Tetris",
    incorrect_answers: ["Pong", "Space Invaders", "Asteroids"],
    points: 3,
  },

  // ============== AI & TECH (Bonus Category) ==============
  {
    id: "ai-001",
    category: "ai",
    difficulty: "easy",
    question: "What does AI stand for?",
    correct_answer: "Artificial Intelligence",
    incorrect_answers: ["Automated Intelligence", "Advanced Integration", "Algorithmic Interface"],
    points: 1,
  },
  {
    id: "ai-002",
    category: "ai",
    difficulty: "easy",
    question: "What company created ChatGPT?",
    correct_answer: "OpenAI",
    incorrect_answers: ["Google", "Microsoft", "Meta"],
    points: 1,
  },
  {
    id: "ai-003",
    category: "ai",
    difficulty: "medium",
    question: "What does LLM stand for in AI?",
    correct_answer: "Large Language Model",
    incorrect_answers: ["Linear Learning Machine", "Logical Language Module", "Limited Learning Model"],
    points: 2,
  },
  {
    id: "ai-004",
    category: "ai",
    difficulty: "medium",
    question: "What AI beat the world champion in Go in 2016?",
    correct_answer: "AlphaGo",
    incorrect_answers: ["Deep Blue", "Watson", "GPT-3"],
    points: 2,
  },
  {
    id: "ai-005",
    category: "ai",
    difficulty: "hard",
    question: "What year was the term 'Artificial Intelligence' coined?",
    correct_answer: "1956",
    incorrect_answers: ["1943", "1965", "1972"],
    points: 3,
  },
  {
    id: "ai-006",
    category: "ai",
    difficulty: "easy",
    question: "What company created Claude?",
    correct_answer: "Anthropic",
    incorrect_answers: ["OpenAI", "Google", "Meta"],
    points: 1,
  },
  {
    id: "ai-007",
    category: "ai",
    difficulty: "medium",
    question: "What does GPT stand for?",
    correct_answer: "Generative Pre-trained Transformer",
    incorrect_answers: ["General Purpose Technology", "Graphical Processing Tool", "Global Prediction Technology"],
    points: 2,
  },
  {
    id: "ai-008",
    category: "ai",
    difficulty: "hard",
    question: "What architecture do most modern LLMs use?",
    correct_answer: "Transformer",
    incorrect_answers: ["RNN", "CNN", "LSTM"],
    points: 3,
  },

  // ============== GENERAL KNOWLEDGE ==============
  {
    id: "gen-001",
    category: "general",
    difficulty: "easy",
    question: "How many days are in a leap year?",
    correct_answer: "366",
    incorrect_answers: ["365", "364", "367"],
    points: 1,
  },
  {
    id: "gen-002",
    category: "general",
    difficulty: "easy",
    question: "What color are emeralds?",
    correct_answer: "Green",
    incorrect_answers: ["Blue", "Red", "Purple"],
    points: 1,
  },
  {
    id: "gen-003",
    category: "general",
    difficulty: "medium",
    question: "What is the hardest natural substance on Earth?",
    correct_answer: "Diamond",
    incorrect_answers: ["Titanium", "Platinum", "Quartz"],
    points: 2,
  },
  {
    id: "gen-004",
    category: "general",
    difficulty: "medium",
    question: "How many strings does a standard guitar have?",
    correct_answer: "6",
    incorrect_answers: ["4", "5", "8"],
    points: 2,
  },
  {
    id: "gen-005",
    category: "general",
    difficulty: "hard",
    question: "What is the largest organ in the human body?",
    correct_answer: "Skin",
    incorrect_answers: ["Liver", "Brain", "Heart"],
    points: 3,
  },
  {
    id: "gen-006",
    category: "general",
    difficulty: "easy",
    question: "What is the main ingredient in guacamole?",
    correct_answer: "Avocado",
    incorrect_answers: ["Tomato", "Onion", "Lime"],
    points: 1,
  },
  {
    id: "gen-007",
    category: "general",
    difficulty: "medium",
    question: "What language has the most native speakers?",
    correct_answer: "Mandarin Chinese",
    incorrect_answers: ["English", "Spanish", "Hindi"],
    points: 2,
  },
  {
    id: "gen-008",
    category: "general",
    difficulty: "hard",
    question: "What is the fear of long words called?",
    correct_answer: "Hippopotomonstrosesquippedaliophobia",
    incorrect_answers: ["Sesquipedalophobia", "Logophobia", "Verbophobia"],
    points: 3,
  },
];

/**
 * Get a random selection of questions for a match
 */
export function getMatchQuestions(count: number = 10): TriviaQuestion[] {
  const shuffled = shuffle(QUESTIONS);
  return shuffled.slice(0, count);
}

/**
 * Get questions by category
 */
export function getQuestionsByCategory(category: string, count: number = 10): TriviaQuestion[] {
  const filtered = QUESTIONS.filter((q) => q.category === category);
  const shuffled = shuffle(filtered);
  return shuffled.slice(0, count);
}

/**
 * Get questions by difficulty
 */
export function getQuestionsByDifficulty(difficulty: "easy" | "medium" | "hard", count: number = 10): TriviaQuestion[] {
  const filtered = QUESTIONS.filter((q) => q.difficulty === difficulty);
  const shuffled = shuffle(filtered);
  return shuffled.slice(0, count);
}

/**
 * Get mixed difficulty questions (balanced)
 */
export function getBalancedQuestions(count: number = 10): TriviaQuestion[] {
  const easy = shuffle(QUESTIONS.filter((q) => q.difficulty === "easy"));
  const medium = shuffle(QUESTIONS.filter((q) => q.difficulty === "medium"));
  const hard = shuffle(QUESTIONS.filter((q) => q.difficulty === "hard"));

  // 4 easy, 4 medium, 2 hard for 10 questions
  const easyCount = Math.floor(count * 0.4);
  const mediumCount = Math.floor(count * 0.4);
  const hardCount = count - easyCount - mediumCount;

  const selected = [
    ...easy.slice(0, easyCount),
    ...medium.slice(0, mediumCount),
    ...hard.slice(0, hardCount),
  ];

  return shuffle(selected);
}

/**
 * Check if an answer is correct (case-insensitive, trimmed)
 */
export function checkAnswer(question: TriviaQuestion, answer: string): boolean {
  const normalizedAnswer = answer.trim().toLowerCase();
  const normalizedCorrect = question.correct_answer.trim().toLowerCase();
  return normalizedAnswer === normalizedCorrect;
}

/**
 * Get all answers for a question (shuffled, includes correct)
 */
export function getShuffledAnswers(question: TriviaQuestion): string[] {
  return shuffle([question.correct_answer, ...question.incorrect_answers]);
}

/**
 * Get total question count
 */
export function getTotalQuestionCount(): number {
  return QUESTIONS.length;
}

/**
 * Get categories
 */
export function getCategories(): string[] {
  return [...new Set(QUESTIONS.map((q) => q.category))];
}
