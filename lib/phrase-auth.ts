// Puzzle/Phrase authentication component
// Users create a 4-word security phrase during signup
// They must enter this phrase during login

export function generatePhraseHint(phrase: string): string[] {
  // Shuffle the words and return hint
  const words = phrase.toLowerCase().split(' ');
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled;
}

export function validatePhrase(input: string, correctPhrase: string): boolean {
  return input.toLowerCase().trim() === correctPhrase.toLowerCase().trim();
}

