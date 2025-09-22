import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateUsername = () => {
  const adjectives = ['Happy', 'Clever', 'Bright', 'Swift', 'Kind', 'Bold', 'Wise', 'Calm'];
  const nouns = ['Fox', 'Eagle', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Owl', 'Hawk'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
};