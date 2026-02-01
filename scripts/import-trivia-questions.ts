/**
 * Import trivia questions from OpenTDB to Supabase
 * Run with: npx tsx scripts/import-trivia-questions.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://onvpybwsicfnvttmnjst.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTDBResponse {
  response_code: number;
  results: OpenTDBQuestion[];
}

// Decode HTML entities
function decodeHTML(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&eacute;/g, "é")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&aacute;/g, "á")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&lrm;/g, "")
    .replace(/&rlm;/g, "");
}

// Map difficulty to points
function difficultyToPoints(difficulty: string): number {
  switch (difficulty) {
    case "easy": return 1;
    case "medium": return 2;
    case "hard": return 3;
    default: return 1;
  }
}

// Fetch questions from OpenTDB
async function fetchFromOpenTDB(amount: number = 50, category?: number): Promise<OpenTDBQuestion[]> {
  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (category) {
    url += `&category=${category}`;
  }
  
  console.log(`Fetching from: ${url}`);
  const response = await fetch(url);
  const data: OpenTDBResponse = await response.json();
  
  if (data.response_code !== 0) {
    console.error(`OpenTDB error code: ${data.response_code}`);
    return [];
  }
  
  return data.results;
}

// Insert questions into Supabase
async function insertQuestions(questions: OpenTDBQuestion[]): Promise<number> {
  const records = questions.map((q, idx) => ({
    question: decodeHTML(q.question),
    correct_answer: decodeHTML(q.correct_answer),
    incorrect_answers: q.incorrect_answers.map(decodeHTML),
    category: q.category,
    difficulty: q.difficulty,
    points: difficultyToPoints(q.difficulty),
    source: "opentdb",
  }));

  const { data, error } = await supabase
    .from("trivia_questions")
    .upsert(records, { 
      onConflict: "question",
      ignoreDuplicates: true 
    })
    .select();

  if (error) {
    console.error("Insert error:", error);
    return 0;
  }

  return data?.length || 0;
}

// OpenTDB category IDs
const CATEGORIES = [
  { id: 9, name: "General Knowledge" },
  { id: 17, name: "Science & Nature" },
  { id: 18, name: "Computers" },
  { id: 19, name: "Mathematics" },
  { id: 21, name: "Sports" },
  { id: 22, name: "Geography" },
  { id: 23, name: "History" },
  { id: 24, name: "Politics" },
  { id: 25, name: "Art" },
  { id: 26, name: "Celebrities" },
  { id: 27, name: "Animals" },
  { id: 28, name: "Vehicles" },
];

async function main() {
  console.log("🎯 Starting OpenTDB import...\n");
  
  let totalImported = 0;
  
  // Fetch from each category
  for (const cat of CATEGORIES) {
    console.log(`📚 Fetching: ${cat.name}...`);
    
    try {
      const questions = await fetchFromOpenTDB(50, cat.id);
      
      if (questions.length > 0) {
        const inserted = await insertQuestions(questions);
        console.log(`   ✅ Imported ${inserted} questions`);
        totalImported += inserted;
      }
      
      // Respect rate limit (5 seconds between requests)
      console.log("   ⏳ Waiting 5s for rate limit...");
      await new Promise(resolve => setTimeout(resolve, 5500));
      
    } catch (err) {
      console.error(`   ❌ Error fetching ${cat.name}:`, err);
    }
  }
  
  console.log(`\n🎉 Import complete! Total questions: ${totalImported}`);
}

main().catch(console.error);
